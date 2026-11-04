#!/usr/bin/env node
/* Is this machine ready for the workshop?  node doctor.mjs */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let problems = 0;
const report = (good, what, fix) => { console.log(`  ${good ? 'ok ' : 'FIX'}  ${good ? what : `${what}: ${fix}`}`); if (!good) problems++; };
const has = (cmd) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;

report(+process.versions.node.split('.')[0] >= 18, `Node ${process.versions.node} (18 or newer)`, 'install Node 18 or newer');
const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: HERE, encoding: 'utf8' });
const head = spawnSync('git', ['rev-parse', '--verify', '-q', 'HEAD'], { cwd: HERE });
report(top.status === 0 && head.status === 0 && fs.realpathSync(top.stdout.trim()) === fs.realpathSync(HERE),
  'this folder is its own git repo, with a first commit', 'run: git init -q && git add -A && git commit -qm "start"');
report(has('claude'), 'Claude Code (claude)', 'install Claude Code');
if (has('herdr-app') && has('hc')) console.log('  ok   the Herdr app, for node race.mjs');
else console.log('  --   no Herdr app: run the race in two terminals instead (WORKSHOP.md), or install it from herdr.dev and put ~/.local/bin on your PATH');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-doctor-'));
const play = spawnSync(process.execPath, ['play.mjs', 'scenarios/first-wave.json', '--out', out], { cwd: HERE, encoding: 'utf8', env: { ...process.env, LANE: '', PLAY_PRIVATE: '1' } });
const ok = /^OK /m.test(play.stdout || '');
report(ok, 'a browser plays the game (Chrome, Edge or Chromium)', ((play.stderr || play.stdout || '').trim().split('\n').pop() || 'no output') + '; CHROME=/path/to/browser picks one');
fs.rmSync(out, { recursive: true, force: true });
console.log(problems ? 'not ready: fix the lines marked FIX, then run this again' : 'ready');
process.exitCode = problems ? 1 : 0;
