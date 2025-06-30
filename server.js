// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js'  : 'application/javascript',
  '.css' : 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.txt' : 'text/plain',
};

function serveFile(filePath, res) {
  const ext  = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Se for diretório, tenta index.html
      if (err.code === 'EISDIR') {
        return serveFile(path.join(filePath, 'index.html'), res);
      }
      // 404 ou 500
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        console.error(`Erro lendo ${filePath}:`, err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  });
}

function runCode(code, callback) {
  const child = spawn('node', [path.join(__dirname, 'opus.js')]);
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', data => {
    stdout += data.toString();
  });
  child.stderr.on('data', data => {
    stderr += data.toString();
  });
  child.on('error', err => {
    stderr += err.message;
  });
  child.on('close', () => {
    callback({ stdout, stderr });
  });
  if (code) {
    child.stdin.write(code);
  }
  child.stdin.end();
}

http.createServer((req, res) => {
   if (req.method === 'POST' && (req.url === '/run' || req.url === '/api/run')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Invalid JSON');
      }
      runCode(data.code || '', result => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
    });
    return;
  }

  // Normaliza e previne acesso fora da pasta
  let safePath = path.normalize(decodeURI(req.url)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '') safePath = '/';
  const filePath = path.join(__dirname, safePath);
  serveFile(filePath, res);
}).listen(PORT, () => {
  console.log(`Server rodando em http://localhost:${PORT}/`);
});
