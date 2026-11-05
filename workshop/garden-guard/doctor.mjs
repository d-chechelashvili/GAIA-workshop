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
  'this folder is its own git repo, with a first commit', 'set it up with: node ../setup.mjs (it makes a garden-guard folder next to GAIA-workshop; work there)');
report(has('claude'), 'Claude Code (claude)', process.platform === 'win32'
  ? 'install it in PowerShell with: irm https://claude.ai/install.ps1 | iex, then open a new terminal'
  : 'install it with: curl -fsSL https://claude.ai/install.sh | bash, then open a new terminal');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-doctor-'));
const play = spawnSync(process.execPath, ['play.mjs', 'scenarios/first-wave.json', '--out', out], { cwd: HERE, encoding: 'utf8', env: { ...process.env, LANE: '', PLAY_WATCH: '' } });
const ok = /^OK /m.test(play.stdout || '');
report(ok, 'a browser plays the game (Chrome, Edge or Chromium)', ((play.stderr || play.stdout || '').trim().split('\n').pop() || 'no output') + '; CHROME=/path/to/browser picks one');
fs.rmSync(out, { recursive: true, force: true });
console.log(problems ? 'not ready: fix the lines marked FIX, then run this again' : 'ready');
process.exitCode = problems ? 1 : 0;
