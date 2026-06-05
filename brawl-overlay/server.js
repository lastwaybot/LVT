const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');


const root = __dirname;
const port = Number(process.env.PORT || 8080);
const host = '127.0.0.1';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

let overlayState = null;
let pendingMessages = [];

http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url.split('?')[0]);

  // CORS headers to ensure overlay can poll even from other local addresses if needed
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (requestPath === '/api/state') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          overlayState = JSON.parse(body);
          res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, headers));
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    } else {
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
      res.end(JSON.stringify(overlayState || {}));
      return;
    }
  }

  if (requestPath === '/api/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        pendingMessages.push(msg);
        res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, headers));
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (requestPath === '/api/messages' && req.method === 'GET') {
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, headers));
    res.end(JSON.stringify(pendingMessages));
    pendingMessages = []; // Clear queue after reading
    return;
  }

  // ── Built-in CORS proxy ──────────────────────────────────────────
  if (requestPath === '/api/proxy' && req.method === 'GET') {
    const params = new URLSearchParams(req.url.split('?')[1] || '');
    const targetUrl = params.get('url');
    if (!targetUrl || !targetUrl.startsWith('https://matcherino.com/')) {
      res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, headers));
      res.end(JSON.stringify({ error: 'Invalid or disallowed URL' }));
      return;
    }
    const parsedUrl = new URL(targetUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrawlOverlay/1.0)',
        'Accept': 'application/json'
      }
    };
    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, Object.assign({ 'Content-Type': 'application/json' }, headers));
        res.end(data);
      });
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502, Object.assign({ 'Content-Type': 'application/json' }, headers));
      res.end(JSON.stringify({ error: 'Proxy fetch failed: ' + e.message }));
    });
    proxyReq.end();
    return;
  }

  if (requestPath === '/') requestPath = '/control/control.html';


  const filePath = path.normalize(path.join(root, requestPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(port, host, () => {
  console.log(`Brawl overlay server running at http://${host}:${port}/`);
});
