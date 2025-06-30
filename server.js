// server.js
const http = require('http');
const fs   = require('fs');
const path = require('path');

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

http.createServer((req, res) => {
  // Normaliza e previne acesso fora da pasta
  let safePath = path.normalize(decodeURI(req.url)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '') safePath = '/';
  const filePath = path.join(__dirname, safePath);
  serveFile(filePath, res);
}).listen(PORT, () => {
  console.log(`Server rodando em http://localhost:${PORT}/`);
});
