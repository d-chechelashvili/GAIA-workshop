// Recorder for Claude Code -> Anthropic API. No API key needed: it forwards Claude Code's own
// (subscription) auth header and never writes headers to disk.
// Usage: node proxy.mjs [port]   then   ANTHROPIC_BASE_URL=http://127.0.0.1:8787 claude
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { describe } from './describe.mjs';

const PORT = Number(process.argv[2] || 8787);
const OUT = `trace-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
let n = 0;

http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers, host: 'api.anthropic.com' };
    delete headers['accept-encoding'];                       // keep the response readable
    const id = ++n;
    const up = https.request({ host: 'api.anthropic.com', path: req.url, method: req.method, headers }, upRes => {
      res.writeHead(upRes.statusCode, upRes.headers);
      const out = [];
      upRes.on('data', c => { out.push(c); res.write(c); });  // pass through to Claude Code as it streams
      upRes.on('end', () => {
        res.end();
        let request; try { request = JSON.parse(body.toString()); } catch { request = body.toString(); }
        const entry = { id, t: new Date().toISOString(), method: req.method, path: req.url, status: upRes.statusCode, request, response: Buffer.concat(out).toString() };
        fs.appendFileSync(OUT, JSON.stringify(entry) + '\n');   // the full record: one line per call
        const line = describe(entry); if (line) console.log(line); // the readable summary on screen
      });
    });
    up.on('error', e => { console.error(e); res.writeHead(502); res.end(); });
    up.end(body);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Recording Claude Code's API calls into ${OUT}\n(listening on http://127.0.0.1:${PORT}, forwarding to api.anthropic.com)`));
