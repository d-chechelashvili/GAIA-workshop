/* The Chrome, Edge or Chromium already on this machine (CHROME=/path picks one): play.mjs drives it,
   and /verify opens its report in it rather than in the default browser. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const local = process.env.LOCALAPPDATA || '', pf = process.env.PROGRAMFILES || 'C:\\Program Files', pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const candidates = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    win32: [`${pf}\\Google\\Chrome\\Application\\chrome.exe`, `${pf86}\\Google\\Chrome\\Application\\chrome.exe`, `${local}\\Google\\Chrome\\Application\\chrome.exe`, `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`, `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`],
  }[process.platform];
  for (const c of candidates || []) if (fs.existsSync(c)) return c;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    for (const dir of (process.env.PATH || '').split(path.delimiter)) if (fs.existsSync(path.join(dir, name))) return path.join(dir, name);
  }
  return null;
}

// Opens a page in that browser, in a new tab if it's already running; the default browser if none.
export function openPage(page) {
  const exe = findChrome(), app = exe && exe.match(/^(.*?\.app)\//)?.[1];
  const [cmd, args] = app ? ['open', ['-a', app, page]]
    : exe ? [exe, [page]]
    : ({ darwin: ['open', [page]], win32: ['cmd', ['/c', 'start', '', page]] }[process.platform] || ['xdg-open', [page]]);
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}
