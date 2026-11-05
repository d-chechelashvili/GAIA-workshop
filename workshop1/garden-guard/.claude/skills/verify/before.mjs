#!/usr/bin/env node
/* Plays a scenario on the game as it was at the last commit, for /verify's before-and-after:

     node .claude/skills/verify/before.mjs .verify/<slug>.json

   It exports HEAD to .verify/base (the working tree is never stashed or switched) and plays the
   scenario there, so its screenshots land in .verify/before/ under the same names as the "after" ones. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const scenario = process.argv[2];
if (!scenario) { console.log('usage: node .claude/skills/verify/before.mjs .verify/<slug>.json'); process.exit(2); }
const BASE = path.join('.verify', 'base');
fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });
const tar = spawnSync('git', ['archive', '--format=tar', 'HEAD'], { maxBuffer: 1 << 28 });
if (tar.status !== 0) { console.error('before: git archive HEAD failed: ' + tar.stderr); process.exit(2); }
const x = spawnSync('tar', ['-x', '-C', BASE], { input: tar.stdout });
if (x.status !== 0) { console.error('before: tar failed: ' + x.stderr); process.exit(2); }
const play = spawnSync(process.execPath, [path.join(BASE, 'play.mjs'), scenario, '--out', path.join('.verify', 'before')], { stdio: 'inherit' });
process.exit(play.status ?? 1);
