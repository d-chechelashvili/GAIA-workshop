#!/usr/bin/env node
/* Starts one of the race's two Claudes:  node lane.mjs plain | yours
   "plain" can't use skills (no Skill tool, so no skill list either) and can't read or run their files:
   a repo without your skill. Built-in commands like /clear still work.
   Each sets LANE, so play.mjs opens that Claude's game window on its own side of the screen. */
import { spawn } from 'node:child_process';

const LANES = {
  plain: ['-n', 'plain', '--disallowedTools', 'Skill', 'Read(./.claude/skills/**)', 'Bash(node .claude/skills:*)'],
  yours: ['-n', 'yours'],
};
const name = process.argv[2];
if (!LANES[name]) { console.log('usage: node lane.mjs plain | yours'); process.exit(2); }

const run = (shell) => spawn('claude', LANES[name], { stdio: 'inherit', env: { ...process.env, LANE: name }, shell });
let child = run(false);
child.on('error', (e) => {
  // On Windows an npm-installed claude is a .cmd file, which only a shell can start.
  if (e.code === 'ENOENT' && process.platform === 'win32') { child = run(true); child.on('exit', (c) => process.exit(c ?? 1)); }
  else { console.error('lane: could not start claude: ' + e.message); process.exit(1); }
});
child.on('exit', (code) => process.exit(code ?? 0));
