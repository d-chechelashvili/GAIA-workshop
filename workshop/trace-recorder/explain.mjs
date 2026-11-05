// Turns a raw trace-*.jsonl into readable files in explained/ for showing on screen.
// Usage: node explain.mjs trace-XXXX.jsonl
import fs from 'node:fs';
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse)
  .filter(e => e.path.startsWith('/v1/messages') && e.status === 200 && typeof e.request === 'object');
const blocks = c => typeof c === 'string' ? [{ type: 'text', text: c }] : c;
const events = e => e.response.split('\n').filter(l => l.startsWith('data: ')).map(l => { try { return JSON.parse(l.slice(6)); } catch { return {}; } });
const usage = e => { const ev = events(e); return Object.assign({}, ev.find(x => x.type === 'message_start')?.message?.usage, ev.findLast(x => x.type === 'message_delta')?.usage); };
const answer = e => { const out = []; let cur;
  for (const x of events(e)) {
    if (x.type === 'content_block_start') { cur = { ...x.content_block, text: x.content_block.text || '', json: '' }; out.push(cur); }
    if (x.type === 'content_block_delta') { if (x.delta.text) cur.text += x.delta.text; if (x.delta.partial_json) cur.json += x.delta.partial_json; }
  } return out; };
const kind = e => { const r = e.request, lastText = blocks(r.messages.at(-1).content).map(b => b.text || '').join(' ');
  if (!r.tools?.length) return 'SIDE CALL: name the session (you never see this)';
  if (/Reply with ONLY the suggestion/.test(lastText)) return 'SIDE CALL: guess your next prompt (the grey ghost text)';
  return 'MAIN LOOP'; };
const n = x => (x ?? 0).toLocaleString('en-US');
const cut = (s, k = 12) => { const l = String(s).split('\n'); return l.length > k ? l.slice(0, k).join('\n') + `\n… (${l.length - k} more lines)` : String(s); };
fs.mkdirSync('explained', { recursive: true });

// 1. Overview: one paragraph per API call
let o = `# Every API call Claude Code made\n\nEach "call" = Claude Code sends the WHOLE conversation to the model and gets one reply back.\nThe model has no memory between calls. Claude Code is the loop that keeps calling it.\n\nTokens: "fresh" = paid in full, "cache write" = stored for reuse, "cache read" = reused at ~10% price.\n`;
for (const e of rows) { const r = e.request, u = usage(e), k = kind(e);
  const said = answer(e).map(b => b.type === 'tool_use' ? `asks to run ${b.name}: ${b.json.slice(0, 90)}` : b.type === 'text' ? `says: "${b.text.trim().slice(0, 90).replace(/\n/g, ' ')}"` : null).filter(Boolean);
  o += `\n## Call ${e.id}  —  ${k}\n  sends:    system prompt + ${r.tools?.length ?? 0} tools + ${r.messages.length} messages\n  replies:  ${said.join('\n            ') || '-'}\n  tokens:   fresh ${n(u.input_tokens)} | cache write ${n(u.cache_creation_input_tokens)} | cache read ${n(u.cache_read_input_tokens)} | output ${n(u.output_tokens)}\n`; }
fs.writeFileSync('explained/1-overview.md', o);

// 2. System prompt, from the first main-loop call
const main = rows.filter(e => kind(e) === 'MAIN LOOP');
const r0 = main[0].request;
let s = `# The system prompt (sent at the top of EVERY call)\n\nIt is ${r0.system.length} blocks. "cached" = marked with cache_control, so later calls reuse it.\n`;
r0.system.forEach((b, i) => { s += `\n\n========== block ${i + 1} of ${r0.system.length}: ${n(b.text.length)} characters, ${b.cache_control ? 'CACHED (ttl ' + (b.cache_control.ttl || '5m') + ')' : 'not cached'} ==========\n\n${b.text}`; });
fs.writeFileSync('explained/2-system-prompt.md', s);

// 3. Tools
let t = `# The tools (also sent on EVERY call)\n\nThe model can't do anything itself. It can only ask Claude Code to run one of these.\n${r0.tools.length} tools:\n\n`;
for (const x of r0.tools) t += `- ${x.name.padEnd(16)} ${(x.description || '').split(/(?<=\.)\s/)[0].slice(0, 110)}\n`;
const read = r0.tools.find(x => x.name === 'Read') || r0.tools[0];
t += `\n\n# One full tool definition: ${read.name}\n\n${JSON.stringify(read, null, 2)}\n`;
fs.writeFileSync('explained/3-tools.md', t);

// Renders a messages array as a transcript. full=false shortens long blocks.
const render = (msgs, { full = false } = {}) => { let c = '';
  msgs.forEach((m, i) => { c += `\n\n----- message ${i + 1}: ${m.role.toUpperCase()} -----\n`;
    for (const b of blocks(m.content)) {
      if (b.type === 'text') { const tx = b.text;
        const note = /claudeMd|Codebase and user instructions/.test(tx) ? '   ← CLAUDE.md, injected into your first message' : /changed on disk/.test(tx) ? '   ← Claude Code noticed a file changed and APPENDED this (cache stays valid)' : tx.startsWith('<system-reminder>') ? '   ← context Claude Code adds automatically' : '';
        c += `\n[text]${note}\n${full ? tx : cut(tx, note ? 8 : 20)}\n`; }
      else if (b.type === 'tool_use') c += `\n[tool_use] the model asks: run ${b.name} with ${JSON.stringify(b.input)}\n`;
      else if (b.type === 'tool_result') { const out = blocks(b.content).map(x => x.text || '').join('\n'); c += `\n[tool_result] Claude Code ran it; output:\n${full ? out : cut(out, 8)}\n`; }
      else if (b.type === 'tool_addition') c += `\n[tool_addition] makes one more tool available: ${b.tool?.definition?.name || b.tool?.name || '?'}\n`;
      else c += `\n[${b.type}]\n`;
      if (b.cache_control) c += `   ⚑ cache breakpoint: everything from the start up to here is cached (ttl ${b.cache_control.ttl || '5m'})\n`; } });
  return c; };

// 4. Conversation: the messages array of the longest main-loop call, as a transcript
const last = main.reduce((a, b) => b.request.messages.length > a.request.messages.length ? b : a);
fs.writeFileSync('explained/4-conversation.md', `# The messages array (call ${last.id})\n\nThis is the "memory": the whole conversation, re-sent every call.\nEach tool request from the model is followed by its result, sent back by Claude Code.\n` + render(last.request.messages));

// 5 and 6. The first two main-loop requests exactly as sent, only pretty-printed
fs.writeFileSync('explained/5-request-1.json', JSON.stringify(main[0].request, null, 2) + '\n');
if (main[1]) fs.writeFileSync('explained/6-request-2.json', JSON.stringify(main[1].request, null, 2) + '\n');
console.log('wrote explained/1-overview.md 2-system-prompt.md 3-tools.md 4-conversation.md 5-request-1.json 6-request-2.json');
