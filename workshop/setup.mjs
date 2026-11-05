#!/usr/bin/env node
/* Sets up the workshop game in one step, on macOS, Linux and Windows:
     node GAIA-workshop/workshop/setup.mjs
   It copies garden-guard next to this repo's folder, makes the copy a git repo of its own with a first
   commit (Claude's settings and worktrees need the game at a repo's root), and runs its machine check.
   If garden-guard is already set up there, it only runs the check again. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'garden-guard');
const DST = path.resolve(HERE, '..', '..', 'garden-guard'); // next to the GAIA-workshop folder, wherever it was cloned or unzipped
const die = (msg) => { console.error(`\n${msg}`); process.exit(1); };
const git = (...args) => {
  const r = spawnSync('git', args, { cwd: DST, encoding: 'utf8' });
  if (r.error) die('git is not installed. Install it from https://git-scm.com, then run this again.');
  return r;
};
const must = (...args) => { const r = git(...args); if (r.status !== 0) die(`git ${args.join(' ')} failed:\n${(r.stderr || r.stdout).trim()}`); return r.stdout.trim(); };
const isOwnRepo = () => {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: DST, encoding: 'utf8' });
  return top.status === 0 && fs.realpathSync(top.stdout.trim()) === fs.realpathSync(DST)
    && spawnSync('git', ['rev-parse', '--verify', '-q', 'HEAD'], { cwd: DST }).status === 0;
};

if (!fs.existsSync(path.join(SRC, 'doctor.mjs'))) die(`The game isn't where it should be: ${SRC}`);
if (fs.existsSync(DST)) {
  if (!isOwnRepo()) die(`${DST} already exists but isn't a set-up copy of the game.\nMove or delete it, then run this again.`);
  console.log(`The game is already set up in ${DST}. Checking this machine again:\n`);
} else {
  console.log(`Copying the game to ${DST}`);
  const skip = new Set(['.verify', 'node_modules', path.join('.claude', 'worktrees')]); // local leftovers, never part of the game
  fs.cpSync(SRC, DST, { recursive: true, filter: (p) => !skip.has(path.relative(SRC, p)) });
  must('init', '-q');
  must('symbolic-ref', 'HEAD', 'refs/heads/main');
  // A first commit needs a name and an email. Many people have never set one; give this repo its own.
  if (git('config', 'user.name').status !== 0 || git('config', 'user.email').status !== 0) {
    must('config', 'user.name', 'Workshop participant');
    must('config', 'user.email', 'participant@garden-guard.invalid');
    console.log('No git name and email set on this machine, so this repo got its own.');
  }
  must('add', '-A');
  must('commit', '-q', '-m', 'start');
  console.log('It is now a git repo of its own, with a first commit. Checking this machine:\n');
}

const doctor = spawnSync(process.execPath, ['doctor.mjs'], { cwd: DST, stdio: 'inherit' });
const rel = path.relative(process.cwd(), DST) || '.';
console.log(doctor.status === 0
  ? `\nNext:\n  cd ${rel}\n  claude          choose "Yes, I trust this folder", then type /exit\n\nThe steps are in ${path.join(rel, 'WORKSHOP.md')}.`
  : `\nFix the lines marked FIX, then check again:\n  cd ${rel}\n  node doctor.mjs`);
process.exitCode = doctor.status ?? 1;
