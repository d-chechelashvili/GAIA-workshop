#!/usr/bin/env node
/* Plays Garden Guard in a real browser from a scenario file, and reports what happened.

     node play.mjs <scenario.json> [--watch] [--out DIR]

   It drives the Chrome, Edge or Chromium already on this machine (CHROME=/path picks one) over
   Chrome's own control pipe: no npm install, no network port. Headless by default; --watch, or a
   LANE set by lane.mjs, opens a window you can watch, on that lane's side of the screen.

   A scenario: {"seed": 1, "viewport": "desktop" | "phone", "steps": [ ... ]}. "phone" is a phone
   held sideways, 844 x 390. Steps, in order:
     {"build": "thorn" | "sprinkler", "at": [col, row]}   cols 0-11, rows 0-7; fails on road or trees
     {"start_wave": true}
     {"ticks": N}                                       60 ticks a second
     {"until": "<event>", "max": N}                     run until that event, at most N ticks
     {"expect": {"wave": 2, "phase": "wave", ...}}      keys of the view below; fails if any differs
     {"expect_event": "<event>"}                        it happened since the last expect_event
     {"screenshot": "<name>.png"}                       the whole page, HUD and build bar included
     {"log": "text"}
   Events: tower_built, wave_started, enemy_spawned, boss_spawned, enemy_slowed, enemy_hit is not
   one (hits show as shots), enemy_defeated, enemy_leaked, wave_cleared, won, lost.
   The view, printed after the run and on a failure: tick, phase, wave (waves started so far), lives,
   gold, beetles (on the road), towers, boss ({hp, x, y} or null) and hud (the text the HUD shows).

   Screenshots go to <out>/<lane>/ (default out: .verify/shots). Every run is also logged to
   .verify/plays.log (the race's feed pane), and .verify/gallery.html shows the newest screenshots of
   each lane side by side. Exit code 1 on a failed step.
*/
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { addShots, feed } from './gallery.mjs';
import { findChrome } from './browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out');
if (!file) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].slice(3)); process.exit(2); }
const lane = process.env.LANE || 'you';
const watch = args.includes('--watch') || !!process.env.LANE;
const outRoot = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join('.verify', 'shots');
const scenario = JSON.parse(fs.readFileSync(file, 'utf8'));
const shared = process.env.PLAY_PRIVATE !== '1'; // doctor's check stays out of the race's feed and gallery
const log = (text) => shared && feed(lane, text);
const VIEWPORTS = { desktop: { width: 680, height: 560, deviceScaleFactor: 1, mobile: false }, phone: { width: 844, height: 390, deviceScaleFactor: 2, mobile: true } };
const vp = VIEWPORTS[scenario.viewport || 'desktop'];
if (!vp) fail(`unknown viewport ${scenario.viewport}: use desktop or phone`);

function fail(msg) { console.error('play: ' + msg); process.exit(2); }

class Browser {
  static async open(noSandbox, headed) {
    const exe = findChrome();
    if (!exe) fail('no Chrome, Edge or Chromium found; install one, or set CHROME=/path/to/it');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-guard-'));
    const x = lane === 'yours' ? 720 : 20;
    const flags = ['--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--disable-gpu-sandbox'];
    if (headed) flags.push(`--window-position=${x},40`, `--window-size=${vp.width + 20},${vp.height + 110}`, '--new-window');
    else flags.push('--headless=new');
    if (noSandbox) flags.push('--no-sandbox');
    const proc = spawn(exe, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
    const b = new Browser(proc, profile);
    const early = await Promise.race([
      new Promise((r) => proc.once('exit', (code) => r({ code }))),
      new Promise((r) => setTimeout(() => r({ code: 'no answer in 10 s' }), 10000)),
      b.send('Browser.getVersion').then(() => null),
    ]);
    if (early) { proc.kill(); fail(`the browser didn't start (${early.code})`); }
    return b;
  }

  // A browser started from inside an agent's command sandbox can't start its own sandbox: it runs, but
  // its pages never load ("Can't open this page"). Then it runs without that sandbox, which is fine for
  // a local game page. The answer is found headless, so a broken window never shows, and remembered.
  static async tryOpen(noSandbox, headed) {
    const browser = await Browser.open(noSandbox, headed);
    const page = await browser.page();
    if (await Promise.race([page.eval('1').then(() => true, () => false), sleep(4000).then(() => false)])) return { browser, page };
    browser.close();
    return null;
  }
  static async launch() {
    const memo = path.join('.verify', 'browser.json');
    let noSandbox = fs.existsSync(memo) && JSON.parse(fs.readFileSync(memo, 'utf8')).noSandbox === true;
    if (!noSandbox) {
      const probe = await Browser.tryOpen(false, false);
      if (probe && !watch) return probe;
      if (probe) probe.browser.close();
      else {
        noSandbox = true;
        say('play: the browser sandbox does not work here, so the browser runs without it');
        fs.mkdirSync('.verify', { recursive: true });
        fs.writeFileSync(memo, JSON.stringify({ noSandbox }));
      }
    }
    const got = await Browser.tryOpen(noSandbox, watch);
    if (!got) fail('the browser started, but its page never answered');
    return got;
  }
  constructor(proc, profile) {
    this.proc = proc; this.profile = profile; this.id = 0; this.waiting = new Map(); this.buf = '';
    proc.stdio[4].on('data', (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf('\0')) >= 0) {
        const msg = JSON.parse(this.buf.slice(0, i)); this.buf = this.buf.slice(i + 1);
        const w = this.waiting.get(msg.id);
        if (w) { this.waiting.delete(msg.id); msg.error ? w.reject(new Error(msg.error.message)) : w.resolve(msg.result); }
      }
    });
  }
  send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const m = { id: ++this.id, method, params };
      if (sessionId) m.sessionId = sessionId;
      this.waiting.set(m.id, { resolve, reject });
      this.proc.stdio[3].write(JSON.stringify(m) + '\0');
    });
  }
  async page() {
    // A fresh tab: commands sent to the browser's first blank tab can go unanswered.
    const { targetInfos } = await this.send('Target.getTargets');
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
    for (const t of targetInfos) if (t.type === 'page') await this.send('Target.closeTarget', { targetId: t.targetId });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    return new Page(this, sessionId);
  }
  close() { this.proc.kill(); setTimeout(() => fs.rmSync(this.profile, { recursive: true, force: true }), 500); }
}

class Page {
  constructor(b, s) { this.b = b; this.s = s; }
  send(method, params) { return this.b.send(method, params, this.s); }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => console.log(line);

async function main() {
  const { browser, page } = await Browser.launch();
  let failed = null;
  try {
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', vp);
    const url = pathToFileURL(path.join(HERE, 'index.html')).href + `?seed=${scenario.seed ?? 1}&clock=manual`;
    await page.send('Page.navigate', { url });
    for (let i = 0; i < 100 && !(await page.eval('!!window.__game').catch(() => false)); i++) await sleep(50);
    await page.eval(`document.title = ${JSON.stringify(lane + ' · Garden Guard')}`);
    let seen = 0, mark = 0;
    const drain = async () => {
      for (const e of await page.eval(`__game.events(${seen})`)) {
        seen = e.id;
        const extra = Object.entries(e).filter(([k]) => !['id', 'tick', 'type'].includes(k)).map(([k, v]) => `${k}=${v}`).join(' ');
        say(`event ${e.type}${extra ? ' ' + extra : ''} at tick ${e.tick}`);
      }
    };
    const advance = async (n, until) => {
      const type = JSON.stringify(until || '');
      if (!watch) await page.eval(until ? `__game.until(${type}, ${n}, ${seen})` : `__game.step(${n})`);
      else for (let done = 0; done < n; done += 2) { // two ticks a frame: about twice real speed
        await page.eval(until ? `__game.until(${type}, ${Math.min(2, n - done)}, ${seen})` : `__game.step(${Math.min(2, n - done)})`);
        if (until && (await page.eval(`__game.events(${seen}).some(e => e.type === ${type})`))) break;
        await sleep(16);
      }
      await drain();
    };
    const steps = scenario.steps || [];
    log(`plays ${path.basename(file)}, ${steps.length} steps${watch ? '' : ' (headless)'}`);
    for (let i = 0; i < steps.length && !failed; i++) {
      const st = steps[i], label = `step ${i + 1}/${steps.length}`;
      if (watch) await page.eval(`__game.caption(${JSON.stringify(`${lane} · ${label}: ${JSON.stringify(st)}`)}, ${JSON.stringify(lane)})`);
      log(`  ${label}: ${JSON.stringify(st)}`);
      if (st.log) say(`-- ${st.log}`);
      else if (st.build) {
        const r = await page.eval(`__game.build(${JSON.stringify(st.build)}, ${st.at[0]}, ${st.at[1]})`);
        if (!r.ok) failed = `${label}: can't build ${st.build} at ${st.at}: ${r.error}`;
        await drain();
      } else if (st.start_wave) {
        const r = await page.eval('__game.startWave()');
        if (!r.ok) failed = `${label}: can't start a wave: ${r.error}`;
        await drain();
      } else if (st.ticks) await advance(st.ticks);
      else if (st.until) {
        const before = seen;
        await advance(st.max || 5000, st.until);
        const hit = (await page.eval(`__game.events(${before})`)).some((e) => e.type === st.until);
        if (!hit) failed = `${label}: no ${st.until} within ${st.max || 5000} ticks`;
      } else if (st.expect) {
        const view = await page.eval('__game.view()');
        const wrong = Object.entries(st.expect).filter(([k, v]) => JSON.stringify(view[k]) !== JSON.stringify(v)).map(([k, v]) => `${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(view[k])}`);
        if (wrong.length) failed = `${label}: ${wrong.join('; ')}`;
      } else if (st.expect_event) {
        const hit = (await page.eval(`__game.events(${mark})`)).find((e) => e.type === st.expect_event);
        if (!hit) failed = `${label}: no ${st.expect_event} event`;
        else { mark = hit.id; say(`expect_event ${st.expect_event}: at tick ${hit.tick}`); }
      } else if (st.screenshot) {
        await page.eval('__game.caption("")');
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        const dir = path.join(outRoot, lane);
        fs.mkdirSync(dir, { recursive: true });
        const where = path.join(dir, st.screenshot);
        fs.writeFileSync(where, Buffer.from(shot.data, 'base64'));
        say(`screenshot ${where} at tick ${(await page.eval('__game.view()')).tick}`);
        if (shared) addShots(lane, dir, file);
        if (watch) await sleep(400);
      } else failed = `${label}: unknown step ${JSON.stringify(st)}`;
    }
    const view = await page.eval('__game.view()');
    say(`view ${JSON.stringify(view)}`);
    say(failed ? `FAIL ${failed}` : `OK ${path.basename(file)}: ${view.tick} ticks, phase ${view.phase}`);
    log(failed ? `  FAIL ${failed}` : `  OK at tick ${view.tick}: ${view.hud}`);
    if (watch) { await page.eval(`__game.caption(${JSON.stringify(`${lane} · ${failed ? 'FAIL' : 'done'}`)}, ${JSON.stringify(lane)})`); await sleep(2500); }
  } finally {
    browser.close();
  }
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => { console.error('play: ' + e.message); process.exit(2); });
