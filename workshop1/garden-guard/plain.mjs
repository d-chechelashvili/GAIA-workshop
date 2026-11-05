#!/usr/bin/env node
/* Claude with no skills, for comparing with /verify:  node plain.mjs
   It can't use skills (no Skill tool, so no skill list either) and can't read or run their files:
   Claude as it would be in a repo without your skill. Built-in commands like /clear still work. */
import { spawn } from 'node:child_process';

const args = ['-n', 'plain', '--disallowedTools', 'Skill', 'Read(./.claude/skills/**)', 'Bash(node .claude/skills:*)', ...process.argv.slice(2)];
const run = (shell) => spawn('claude', args, { stdio: 'inherit', env: { ...process.env, LANE: 'plain' }, shell });
let child = run(false);
child.on('error', (e) => {
  // On Windows an npm-installed claude is a .cmd file, which only a shell can start.
  if (e.code === 'ENOENT' && process.platform === 'win32') { child = run(true); child.on('exit', (c) => process.exit(c ?? 1)); }
  else { console.error('plain: could not start claude: ' + e.message); process.exit(1); }
});
child.on('exit', (code) => process.exit(code ?? 0));
