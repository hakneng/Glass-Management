/**
 * Zero-dependency Local Web Server for High School Student Score Management System
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

let PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('រកមិនឃើញទំព័រនេះឡើយ (404 Not Found)');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // Check if the running server is already serving our app
    const checkReq = http.get(`http://localhost:${PORT}`, (res) => {
      console.log(`====================================================`);
      console.log(`🎓 កម្មវិធីគ្រប់គ្រងពិន្ទុសិស្សថ្នាក់ទី១២ (Digital Gradebook)`);
      console.log(`📡 Server កំពុងដំណើរការរួចរាល់ហើយលើ: http://localhost:${PORT}`);
      console.log(`✨ កម្មវិធីបានបើកដំណើរការរួចជាស្រេចនៅលើ Browser របស់លោកអ្នក!`);
      console.log(`====================================================`);
    });

    checkReq.on('error', () => {
      // If port is used by something else, try next port
      const nextPort = PORT + 1;
      console.log(`⚠️ ច្រក ${PORT} កំពុងជាប់រវល់។ កំពុងប្តូរទៅច្រក http://localhost:${nextPort} ...`);
      PORT = nextPort;
      server.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🎓 កម្មវិធីគ្រប់គ្រងពិន្ទុសិស្សថ្នាក់ទី១២ (Digital Gradebook)`);
        console.log(`📡 Server កំពុងដំណើរការលើ: http://localhost:${PORT}`);
        console.log(`====================================================`);
      });
    });
    return;
  }
  console.error('❌ Server Error:', err.message);
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎓 កម្មវិធីគ្រប់គ្រងពិន្ទុសិស្សថ្នាក់ទី១២ (Digital Gradebook)`);
  console.log(`📡 Server កំពុងដំណើរការលើ: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
