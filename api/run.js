// api/run.js
const { spawn } = require('child_process');
const path = require('path');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ stderr: 'Method Not Allowed' });
  }

  const { code = '' } = req.body;       // Vercel já parseia JSON no body
  let stdout = '';
  let stderr = '';

  // executa o seu parser/opus
  const child = spawn('node', [path.join(process.cwd(), 'opus.js')]);

  child.stdout.on('data', data => { stdout += data.toString(); });
  child.stderr.on('data', data => { stderr += data.toString(); });
  child.on('error', err => { stderr += err.message; });

  child.on('close', () => {
    res.status(200).json({ stdout, stderr });
  });

  // envia o código para stdin
  child.stdin.write(code);
  child.stdin.end();
}
