/* What the race shows about each Claude's play: .verify/plays.log, one line per thing play.mjs did
   (the race's feed pane follows it), and .verify/gallery.html, the newest screenshots side by side. */
import fs from 'node:fs';
import path from 'node:path';

const DIR = '.verify', SHOTS = path.join(DIR, 'gallery.json'), PAGE = path.join(DIR, 'gallery.html');
export const PLAYS = path.join(DIR, 'plays.log');

export function feed(lane, text) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.appendFileSync(PLAYS, `${lane}\t${new Date().toLocaleTimeString()}\t${text}\n`);
}

export function addShots(lane, dir, scenarioFile) {
  const shots = fs.existsSync(SHOTS) ? JSON.parse(fs.readFileSync(SHOTS, 'utf8')) : [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f), at = fs.statSync(p).mtimeMs, known = shots.find((s) => s.path === p);
    if (known) known.at = at; else shots.push({ lane, path: p, at, scenario: path.basename(scenarioFile) });
  }
  fs.writeFileSync(SHOTS, JSON.stringify(shots));
  writeGallery(shots);
}

// The page polls gallery-data.js (a script, because pages opened from disk can't fetch files) and
// redraws only when a screenshot was added, so it doesn't flicker.
export function writeGallery(shots = []) {
  fs.mkdirSync(DIR, { recursive: true });
  const data = shots.map((s) => ({ lane: s.lane, src: path.relative(DIR, s.path).split(path.sep).join('/') + '?' + Math.round(s.at), name: path.basename(s.path), scenario: s.scenario, at: new Date(s.at).toLocaleTimeString(), t: s.at }));
  fs.writeFileSync(path.join(DIR, 'gallery-data.js'), `window.__shots(${JSON.stringify(data)});\n`);
  if (!fs.existsSync(PAGE)) fs.writeFileSync(PAGE, `<!doctype html><meta charset="utf-8"><title>What each Claude looked at</title>
<style>body{margin:0;background:#1d1d1b;color:#eee;font:14px system-ui}main{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:16px;padding:16px}h2{margin:0 0 8px;font-size:18px}.plain h2{color:#f3c58d}.yours h2{color:#9ec5f4}img{width:100%;border-radius:6px;display:block}figure{margin:0 0 14px}figcaption{opacity:.7;margin-top:4px}</style>
<main id="m"></main>
<script>
let last = '';
window.__shots = (shots) => {
  const key = JSON.stringify(shots);
  if (key === last) return;
  last = key;
  const lanes = [...new Set(['plain', 'yours', ...shots.map((s) => s.lane)])];
  const count = (n) => n + (n === 1 ? ' screenshot' : ' screenshots');
  document.getElementById('m').innerHTML = lanes.map((l) => {
    const mine = shots.filter((s) => s.lane === l).sort((a, b) => b.t - a.t);
    const figs = mine.slice(0, 6).map((s) => '<figure><img src="' + s.src + '"><figcaption>' + s.name + ' · ' + s.scenario + ' · ' + s.at + '</figcaption></figure>').join('') || '<p>nothing yet</p>';
    return '<section class="' + l + '"><h2>' + l + ': ' + count(mine.length) + '</h2>' + figs + '</section>';
  }).join('');
};
function poll() { const s = document.createElement('script'); s.src = 'gallery-data.js?' + Date.now(); s.onload = s.onerror = () => s.remove(); document.head.appendChild(s); }
poll(); setInterval(poll, 1500);
</script>`);
  return path.resolve(PAGE);
}
