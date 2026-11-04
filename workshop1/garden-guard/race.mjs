#!/usr/bin/env node
/* The workshop race, laid out by the Herdr app: two Claudes side by side, one with no skills and one
   with yours, a pane that asks both at once, and a feed of everything either one plays.

     node race.mjs          with the Herdr app open, from this folder

   It opens a space called "garden race": "plain" (lane.mjs plain) and "yours" (lane.mjs yours) on top,
   "ask both" and the plays feed below. A question typed in "ask both" goes to "plain" as typed and
   to "yours" as "/verify <question>"; a line that starts with "/" (like /clear) goes to both as typed.
   Each Claude's game window opens on its own side of the screen while it plays, and the screenshot
   gallery opens in your browser. Running it again closes the previous race, and its Claudes, first.

   The panes run this file too: `race.mjs ask <plain> <yours>` and `race.mjs feed`.
   Without Herdr, run `node lane.mjs plain` and `node lane.mjs yours` in two terminals instead.
*/
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { PLAYS, writeGallery } from './gallery.mjs';
import { openPage } from './browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
process.chdir(HERE);
const SPACE = 'garden race';
const self = (...a) => [process.execPath, path.join(HERE, 'race.mjs'), ...a];
const lane = (name) => [process.execPath, path.join(HERE, 'lane.mjs'), name];
const die = (msg) => { console.error('race: ' + msg); process.exit(2); };
const has = (cmd) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;

function app(command, args) {
  const r = spawnSync('herdr-app', ['do', command, JSON.stringify(args)], { encoding: 'utf8' });
  let reply = {};
  try { reply = JSON.parse(r.stdout || '{}'); } catch { /* reported below */ }
  if (r.status !== 0 || reply.error) die(`herdr-app do ${command} failed: ${reply.error || r.stderr.trim()}`);
  return reply;
}
const tree = () => JSON.parse(spawnSync('herdr-app', ['ls'], { encoding: 'utf8' }).stdout || '{"spaces":[]}');

// Splits start straight from herdr-core, whose PATH can be bare (on macOS it runs under launchd).
// Going through the login shell gives each pane what the person's own terminal has: claude, hc, node.
function inShell(argv) {
  const sh = process.env.SHELL;
  if (process.platform === 'win32' || !sh) return argv;
  return path.basename(sh) === 'fish' ? [sh, '-lic', 'exec $argv', ...argv] : [sh, '-lic', 'exec "$@"', 'race', ...argv];
}

function paneOf(terminal) { // space.new answers with the terminal; splits need its pane
  for (const s of tree().spaces) for (const t of s.tabs) for (const x of t.terminals) if (x.terminal === terminal) return x.pane;
  die(`Herdr didn't list terminal ${terminal}`);
}

function setup() {
  for (const tool of ['herdr-app', 'hc', 'claude']) if (!has(tool)) die(`${tool} is not on the PATH; node doctor.mjs says how to get it`);
  if (spawnSync('herdr-app', ['status'], { stdio: 'ignore' }).status !== 0) die('open the Herdr app first, then run this again');
  for (const s of tree().spaces) {
    if (s.name === SPACE && s.folder && fs.realpathSync(s.folder) === fs.realpathSync(HERE)) { app('space.close', { id: s.id, confirmed: true }); console.log('Closed the previous race.'); }
  }
  fs.rmSync('.verify/plays.log', { force: true });
  for (const f of ['gallery.json', 'gallery.html', 'gallery-data.js']) fs.rmSync(path.join('.verify', f), { force: true });
  const page = writeGallery();
  // Each split halves its pane: this order gives four equal panes. space.new already runs its argv
  // in the person's shell; splits don't, hence inShell.
  const plain = app('space.new', { name: SPACE, tab: 'race', folder: HERE, argv: lane('plain') });
  const plainPane = paneOf(plain.terminal);
  const yours = app('pane.split', { direction: 'right', pane: plainPane, argv: inShell(lane('yours')) });
  const ask = app('pane.split', { direction: 'down', pane: plainPane, argv: inShell(self('ask', plain.terminal, yours.terminal)) });
  app('pane.split', { direction: 'down', pane: yours.pane, argv: inShell(self('feed')) });
  app('pane.focus', { pane: ask.pane });
  openPage(page);
  console.log(`The race is open in Herdr, in the space "${SPACE}". The gallery: ${page}`);
}

// Sends to both at once: hc send waits for each paste to settle, so one after the other would
// give "plain" a head start.
function send(terminal, text) {
  return new Promise((resolve) => {
    const p = spawn('hc', ['send', terminal, text], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('error', (error) => resolve({ error }));
    p.on('close', (code) => resolve({ code, out: out.trim() }));
  });
}

function ask(plain, yours) {
  console.log('ask both: type a question and press Enter. /clear clears both.\n');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'ask both › ' });
  rl.prompt();
  rl.on('line', async (raw) => {
    const line = raw.trim();
    if (line) {
      const both = line.startsWith('/');
      const lanes = [['plain', plain, line], ['yours', yours, both ? line : '/verify ' + line]];
      const results = await Promise.all(lanes.map(([, t, text]) => send(t, text)));
      if (results.some((r) => r.error)) console.log("  hc is not on this pane's PATH; type into the Claude panes directly");
      else lanes.forEach(([name, , text], i) => console.log(results[i].code === 0 ? `  ${name} ← ${text}` : `  ${name}: not sent: ${results[i].out}`));
    }
    rl.prompt();
  });
}

// What each Claude has played, newest at the bottom, with a count per lane on the last line.
function feedPane() {
  const paint = { plain: '33', yours: '34' };
  const color = (l, s) => (paint[l] && process.stdout.isTTY ? `\x1b[1;${paint[l]}m${s}\x1b[0m` : s);
  let shown = null; // null, so the first draw shows "nothing yet"
  const draw = () => {
    const text = fs.existsSync(PLAYS) ? fs.readFileSync(PLAYS, 'utf8') : '';
    if (text === shown) return;
    shown = text;
    const rows = text.split('\n').filter(Boolean).map((l) => l.split('\t'));
    const plays = (l) => rows.filter((r) => r[0] === l && r[2].startsWith('plays ')).length;
    const room = Math.max(5, (process.stdout.rows || 24) - 4);
    const body = rows.slice(-room).map(([l, at, t]) => `${color(l, l.padEnd(5))} ${at}  ${t}`).join('\n');
    process.stdout.write('\x1b[2J\x1b[H' + 'PLAYS: what each Claude ran in the game\n\n' + (body || 'nothing yet') + '\n\n'
      + `played so far:  ${color('plain', 'plain ' + plays('plain'))}   ${color('yours', 'yours ' + plays('yours'))}`);
  };
  draw();
  setInterval(draw, 400);
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd) setup();
else if (cmd === 'ask' && rest.length === 2) ask(...rest);
else if (cmd === 'feed') feedPane();
else { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].slice(3)); process.exitCode = 2; }
