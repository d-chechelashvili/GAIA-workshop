#!/usr/bin/env node
/* Turns a /verify answer into one page you can read at a glance, and opens it in the browser:

     node .claude/skills/verify/report.mjs .verify/<slug>.report.json

   The report file is small; Claude writes only what it judged:
     {"question": "...", "verdict": "yes" | "no" | "unclear", "headline": "one sentence",
      "command": "node play.mjs .verify/<slug>.json",
      "shots": [{"file": ".verify/shots/yours/w2.png", "saw": "what a player sees", "ok": true | false,
                 "before": ".verify/before/yours/w2.png"}]}          ("before" only for a change)
   Everything else comes from what play.mjs recorded: the game state saved next to each screenshot
   (<name>.view.json), which moment of the game it was, and whether the game's code is changed. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { openPage } from '../../../browser.mjs';

const file = process.argv[2];
if (!file) { console.log('usage: node .claude/skills/verify/report.mjs .verify/<slug>.report.json'); process.exit(2); }
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const OUT = path.join('.verify', 'report.html');
let WAVES = 3;
try { WAVES = createRequire(import.meta.url)(path.resolve('game/engine.js')).WAVES.length; } catch {}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const src = (p) => p && path.relative(path.dirname(OUT), p).split(path.sep).join('/') + '?' + (fs.existsSync(p) ? Math.round(fs.statSync(p).mtimeMs) : 0);
const viewOf = (p) => { try { return JSON.parse(fs.readFileSync(p.replace(/\.png$/i, '') + '.view.json', 'utf8')); } catch { return null; } };

// The moments of a game, in order; each screenshot lands in one of them.
const MOMENTS = [['before', 'Before wave 1']];
for (let w = 1; w <= WAVES; w++) { MOMENTS.push([`wave${w}`, `During wave ${w}`]); if (w < WAVES) MOMENTS.push([`between${w}`, `Between ${w} and ${w + 1}`]); }
MOMENTS.push(['end', 'After the last']);
function momentOf(v) {
  if (!v) return null;
  if (v.phase === 'won' || v.phase === 'lost') return 'end';
  if (v.phase === 'wave') return `wave${v.wave}`;
  return v.wave === 0 ? 'before' : `between${v.wave}`;
}

const shots = (r.shots || []).map((s) => ({ ...s, view: viewOf(s.file), moment: momentOf(viewOf(s.file)) }));
let codeChanged = null;
try { codeChanged = execFileSync('git', ['status', '--porcelain', '--', 'game', 'index.html', 'style.css'], { encoding: 'utf8' }).trim(); } catch {}

const verdict = { yes: ['YES', 'good'], no: ['NO', 'bad'], partly: ['PARTLY', 'meh'], unclear: ['UNCLEAR', 'meh'] }[String(r.verdict).toLowerCase()] || ['?', 'meh'];
const mark = (s) => s.ok === true ? '<b class="good">✓</b>' : s.ok === false ? '<b class="bad">✗</b>' : '<b class="meh">?</b>';

const timeline = MOMENTS.map(([key, label]) => {
  const here = shots.filter((s) => s.moment === key);
  const cls = !here.length ? 'unchecked' : here.some((s) => s.ok === false) ? 'bad' : here.every((s) => s.ok === true) ? 'good' : 'meh';
  const inner = here.length ? `<img src="${src(here[0].file)}"><span>${here.some((s) => s.ok === false) ? '✗' : '✓'} ${esc(here[0].view?.hud?.split(' · ')[0] || '')}</span>` : '<span>not checked</span>';
  return `<li class="${cls}"><em>${label}</em>${inner}</li>`;
}).join('');

const cards = shots.map((s, i) => {
  const v = s.view;
  const where = MOMENTS.find(([k]) => k === s.moment)?.[1] || 'unknown moment';
  const pic = (p, cap) => `<figure><img src="${src(p)}"><figcaption>${cap}</figcaption></figure>`;
  return `<section class="card ${s.ok === false ? 'bad' : s.ok === true ? 'good' : 'meh'}">
  <div class="pics">${s.before ? pic(s.before, 'before your change') + pic(s.file, 'after') : pic(s.file, esc(s.file))}</div>
  <div class="facts">
    <h3>${i + 1}. ${where}${v ? ` <small>tick ${v.tick} · ${(v.tick / 60).toFixed(1)} s</small>` : ''}</h3>
    <dl>
      <dt>On screen</dt><dd class="big">${esc(v?.hud?.split(' · ')[0] || '—')}</dd>
      <dt>In the game</dt><dd class="big">${v ? `${v.phase === 'wave' ? 'wave ' + v.wave + ' running' : v.phase === 'build' ? (v.wave ? `wave ${v.wave} done` : 'no wave yet') : v.phase}` : 'not recorded'}</dd>
    </dl>
    <div class="mark">${mark(s)}</div>
    <p class="saw">“${esc(s.saw)}”</p>
  </div>
</section>`;
}).join('');

const checked = new Set(shots.map((s) => s.moment).filter(Boolean)).size;
fs.mkdirSync('.verify', { recursive: true });
fs.writeFileSync(OUT, `<!doctype html><meta charset="utf-8"><title>/verify: ${esc(verdict[0])}</title>
<style>
:root{--good:#3fbf6a;--bad:#e5484d;--meh:#e5a93b;--bg:#141413;--card:#1f1f1d;--ink:#f2f0ea;--dim:#8d8a82}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.4 system-ui,sans-serif}
.good{color:var(--good)}.bad{color:var(--bad)}.meh{color:var(--meh)}
header{padding:28px 32px 20px}
.badge{display:inline-block;font:600 13px system-ui;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);border:1px solid #3a3935;border-radius:99px;padding:4px 12px}
.q{font-size:22px;margin:14px 0 18px;color:var(--dim)}.q b{color:var(--ink);font-weight:500}
.verdict{display:flex;align-items:center;gap:24px;border-radius:14px;padding:18px 26px}
.verdict.good{background:rgba(63,191,106,.15);border:2px solid var(--good)}.verdict.bad{background:rgba(229,72,77,.15);border:2px solid var(--bad)}.verdict.meh{background:rgba(229,169,59,.15);border:2px solid var(--meh)}
.verdict strong{font-size:64px;line-height:1;font-weight:800}.verdict p{margin:0;font-size:24px}
h2{font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:28px 32px 10px}
ol.timeline{display:grid;grid-template-columns:repeat(${MOMENTS.length},1fr);gap:10px;list-style:none;margin:0;padding:0 32px}
.timeline li{border-radius:10px;padding:8px;min-height:120px;display:flex;flex-direction:column;gap:6px;background:var(--card);border:2px solid transparent}
.timeline em{font-style:normal;font-size:13px;color:var(--dim)}.timeline img{width:100%;border-radius:4px}
.timeline span{font-weight:700;font-size:15px}
.timeline li.good{border-color:var(--good)}.timeline li.good span{color:var(--good)}
.timeline li.bad{border-color:var(--bad)}.timeline li.bad span{color:var(--bad)}
.timeline li.unchecked{background:repeating-linear-gradient(135deg,#1b1b19 0 8px,#222220 8px 16px);border:2px dashed #3a3935;justify-content:center}
.timeline li.unchecked span{color:var(--dim);font-weight:500;text-align:center}
.note{margin:8px 32px 0;color:var(--dim)}
.card{color:var(--ink)!important;display:grid;grid-template-columns:minmax(0,520px) minmax(0,1fr);gap:24px;margin:0 32px 18px;padding:18px;background:var(--card);border-radius:14px;border-left:6px solid var(--meh)}
.card.good{border-left-color:var(--good)}.card.bad{border-left-color:var(--bad)}
.pics{display:flex;gap:12px}.pics figure{margin:0;flex:1}.pics img{width:100%;border-radius:8px;display:block}figcaption{color:var(--dim);font-size:13px;margin-top:4px}
.facts{position:relative}.facts h3{margin:0 0 14px;font-size:20px}.facts small{color:var(--dim);font-weight:400;font-size:14px}
dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:6px 16px;align-items:baseline}dt{color:var(--dim)}dd{margin:0}.big{font-size:26px;font-weight:700}
.card.bad .mark,.card.bad .big{color:var(--bad)}.card.good .mark,.card.good .big{color:var(--good)}
.mark{position:absolute;top:-6px;right:0;font-size:56px;line-height:1}
.saw{margin:16px 0 0;font-size:17px;font-style:italic}
footer{display:flex;flex-wrap:wrap;gap:10px;padding:10px 32px 40px}footer span{background:var(--card);border-radius:99px;padding:6px 14px;font-size:14px}code{font-size:13px}
@media (max-width:900px){ol.timeline{grid-template-columns:repeat(4,1fr)}.card{grid-template-columns:1fr}}
</style>
<header>
  <span class="badge">/verify · played in a real browser</span>
  <div class="q">Question: <b>${esc(r.question)}</b></div>
  <div class="verdict ${verdict[1]}"><strong>${verdict[0]}</strong><p>${esc(r.headline)}</p></div>
</header>
<h2>Which moments of the game it looked at</h2>
<ol class="timeline">${timeline}</ol>
<p class="note">${checked === MOMENTS.length ? `All ${checked} moments checked.` : `${checked} of ${MOMENTS.length} moments checked.`}</p>
<h2>What it saw</h2>
${cards || '<p class="note">No screenshots: without a picture there is no answer yet.</p>'}
<footer>
  ${r.command ? `<span>▶ <code>${esc(r.command)}</code></span>` : ''}
  <span>${shots.length} screenshot${shots.length === 1 ? '' : 's'}</span>
  <span>${codeChanged === null ? 'game code: unknown' : codeChanged ? '✎ game code has uncommitted changes' : '✓ game code untouched'}</span>
</footer>`);
console.log(`report: ${path.resolve(OUT)}`);
openPage(path.resolve(OUT));
