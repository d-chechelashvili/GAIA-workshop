// Turns one recorded call into a few readable lines for the live screen. Display only:
// the trace file always gets the full, untouched request and response.
const C = { dim: s => `\x1b[2m${s}\x1b[0m`, bold: s => `\x1b[1m${s}\x1b[0m`, cyan: s => `\x1b[1;36m${s}\x1b[0m`, yellow: s => `\x1b[33m${s}\x1b[0m` };
const fmt = n => (n ?? 0).toLocaleString('en-US');
const short = (s, n = 60) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const blocks = c => typeof c === 'string' ? [{ type: 'text', text: c }] : c;
let prevLen = 0, turn = 0, step = 0;

// what the model sent back, rebuilt from the streamed events
function reply(response) {
  const out = []; let cur;
  for (const line of response.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    let x; try { x = JSON.parse(line.slice(6)); } catch { continue; }
    if (x.type === 'content_block_start') out.push(cur = { ...x.content_block, text: '', json: '' });
    if (x.type === 'content_block_delta') { cur.text += x.delta.text || ''; cur.json += x.delta.partial_json || ''; }
    if (x.type === 'message_start') out.usage = x.message.usage;
    if (x.type === 'message_delta') out.usage = { ...out.usage, ...x.usage };
  }
  return out;
}

// a tool request in plain words: "Bash: python3 test_pricing.py", "Edit pricing.py: ">" → ">=""
const base = p => String(p).split('/').pop();
function tool(name, input) {
  if (name === 'Bash') return `Bash: ${short(String(input.command).replace(/^cd \S+ && /, ''), 44)}`;
  if (name === 'Edit') return `Edit ${base(input.file_path)}: "${short(input.old_string, 18)}" → "${short(input.new_string, 18)}"`;
  if (input.file_path) return `${name} ${base(input.file_path)}`;
  return `${name}: ${short(Object.values(input)[0] ?? '', 40)}`;
}

// what's new in a message the model hasn't seen before
function describeNew(m) {
  const out = [];
  for (const b of blocks(m.content)) {
    if (b.type === 'tool_result') { const lines = blocks(b.content).map(x => x.text || '').join('\n').split('\n').filter(l => l.trim());
      out.push(`tool output: "${short((lines.at(-1) ?? '').replace(/\/\S*\/([^/\s]+)/g, '$1'), 50)}"`); }
    else if (b.type === 'text' && /changed on disk/.test(b.text)) out.push(C.yellow('note: "CLAUDE.md changed on disk" + the changed lines'));
    else if (b.type === 'text' && !b.text.startsWith('<system-reminder>') && m.role === 'user') out.push(`your prompt: "${short(b.text, 46)}"`);
  }
  return out;
}

export function describe(e) {
  const r = e.request;
  if (e.path.startsWith('/api/hello')) return C.dim(`  · call ${e.id}: hidden side call, connection check`);
  if (!e.path.startsWith('/v1/messages') || typeof r !== 'object') return '';                  // other housekeeping: not shown
  if (r.max_tokens === 1 && JSON.stringify(r.messages?.[0]?.content ?? '').includes('quota'))   // 1-token "quota" probe at startup
    return C.dim(`  · call ${e.id}: hidden side call, usage-limit check (${e.status === 200 ? 'ok' : `${e.status}, harmless, not retried`})`);
  if (e.status !== 200) return C.dim(`  · call ${e.id}: rejected (${e.status})`);
  const rep = reply(e.response), u = rep.usage || {};
  const said = rep.map(b => b.type === 'tool_use' ? `asks to run ${tool(b.name, JSON.parse(b.json || '{}'))}` : b.type === 'text' ? `says "${short(b.text, 50)}"` : null).filter(Boolean);
  const last = blocks(r.messages.at(-1).content).map(b => b.text || '').join(' ');
  const txt = rep.filter(b => b.type === 'text').map(b => b.text).join(' ');
  if (!r.tools?.length) return C.dim(`  · call ${e.id}: hidden side call, names the session: "${short(txt.match(/"title":"([^"]*)"/)?.[1] ?? txt, 40)}"`);
  if (/Reply with ONLY the suggestion/.test(last)) return C.dim(`  · call ${e.id}: hidden side call, guesses your next prompt: "${short(txt, 40)}"`);

  // main loop
  const fresh = r.messages.slice(r.messages.length > prevLen ? prevLen : 0).flatMap(describeNew);
  if (fresh.some(f => f.startsWith('your prompt'))) { turn++; step = 0; }
  step++; prevLen = r.messages.length;
  const read = u.cache_read_input_tokens || 0, made = (u.cache_creation_input_tokens || 0) + (u.input_tokens || 0), total = read + made;
  const pct = total ? Math.round(100 * read / total) : 0, bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
  return [
    '',
    C.cyan(`── call ${e.id} · your request ${turn}, round trip ${step} `.padEnd(64, '─')),
    `  sends   system prompt + ${r.tools.length} tools + ${r.messages.length} messages (${fmt(total)} tokens)`,
    ...fresh.map((f, i) => `  ${i ? '     ' : C.bold('new  ')}   ${f}`),
    ...(said.length ? said : ['-']).map((x, i) => `  ${i ? '     ' : C.bold('reply')}   ${x}`),
    `  cache   ${bar} ${pct}% reused, ${fmt(made)} new`,
  ].join('\n');
}
