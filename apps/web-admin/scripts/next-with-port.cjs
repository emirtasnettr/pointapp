/**
 * Varsayılan: tanıtım + yönetim 7200.
 * Örn: WEB_ADMIN_PORT=5050 npm run dev
 */
const { spawn } = require('child_process');
const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');

const cmd = process.argv[2];
if (cmd !== 'dev' && cmd !== 'start') {
  console.error('Usage: node next-with-port.cjs <dev|start>');
  process.exit(1);
}

const port = process.env.WEB_ADMIN_PORT || process.env.PORT || '7200';
const cwd = path.join(__dirname, '..');
const req = createRequire(path.join(cwd, 'package.json'));
let nextBin;
try {
  nextBin = req.resolve('next/dist/bin/next');
} catch {
  console.error('Next.js bulunamadı. Monorepo kökünden `npm install` çalıştırın.');
  process.exit(1);
}

if (!fs.existsSync(nextBin)) {
  console.error('next bin yolu geçersiz:', nextBin);
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, cmd, '-p', port], {
  stdio: 'inherit',
  cwd,
  env: { ...process.env },
});

child.on('exit', (code) => process.exit(code ?? 0));
