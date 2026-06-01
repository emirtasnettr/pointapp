#!/usr/bin/env node
/**
 * Fiziksel telefon / LAN testi için bilgisayarın gerçek IPv4 adreslerini yazar.
 * Telefonda tarayıcıda: http://<buradaki-ip>:5001/v1/health
 */
import os from 'node:os';

const port = process.env.PORT || '5001';
const ifs = os.networkInterfaces();
const rows = [];

for (const [name, addrs] of Object.entries(ifs)) {
  if (!addrs) continue;
  for (const a of addrs) {
    if (a.family !== 'IPv4' || a.internal) continue;
    rows.push({ name, address: a.address });
  }
}

if (!rows.length) {
  console.log('Yerel IPv4 bulunamadı.');
  process.exit(1);
}

console.log('API çalışırken telefonda dene (aynı Wi‑Fi):\n');
for (const { name, address } of rows) {
  console.log(`  ${name.padEnd(8)}  http://${address}:${port}/v1/health`);
}
console.log('\nMac’te doğrulama: curl "http://' + rows[0].address + ':' + port + '/v1/health"');
