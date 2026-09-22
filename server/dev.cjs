const http = require('node:http');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

process.chdir(path.resolve(__dirname, '..'));
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const handler = require('../api/send-order.ts').default;

const server = http.createServer(async (request, response) => {
  response.status = code => { response.statusCode = code; return response; };
  response.json = data => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(data));
  };
  if (request.url?.split('?')[0] !== '/api/send-order') {
    response.status(404).json({ message: 'Not Found' });
    return;
  }
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (Buffer.byteLength(body) > 16384) {
        response.status(413).json({ message: 'Request too large' });
        return;
      }
    }
    try { request.body = body ? JSON.parse(body) : undefined; }
    catch { response.status(400).json({ message: 'Invalid JSON' }); return; }
    await handler(request, response);
  } catch {
    response.status(500).json({ message: 'تعذر إرسال الطلب حالياً.' });
  }
});

server.on('error', error => { console.error(error.message); process.exit(1); });
server.listen(3001, '127.0.0.1', () => {
  console.log('Orders API: http://127.0.0.1:3001');
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !process.env.TELEGRAM_CHAT_ID?.trim()) {
    console.warn('Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local to receive orders.');
  }
  if (process.argv.includes('--api-only')) return;
  const angular = spawn(process.execPath, [require.resolve('@angular/cli/bin/ng.js'), 'serve', '--port', '4200'], { stdio: 'inherit' });
  const stop = () => { angular.kill(); server.close(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  angular.on('exit', code => { server.close(); process.exitCode = code ?? 0; });
});
