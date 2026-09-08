import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('BROWSER_PLAYBACK_MOTION_WINDOW_20260830.md');
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/BROWSER_PLAYBACK_MOTION_WINDOW_20260830.md') {
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
    const name = path.basename(file);
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(404); res.end('Not found');
});
server.listen(3099, '0.0.0.0');
