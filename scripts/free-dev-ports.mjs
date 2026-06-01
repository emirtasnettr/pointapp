#!/usr/bin/env node
/**
 * macOS / Linux: Point dev stack + eski varsayılan portlarda dinleyen süreçlere SIGTERM.
 * Windows’ta atlanır (lsof yok).
 */
import { execSync } from 'node:child_process';
import process from 'node:process';

const ports = [
  7199, 7200, 7201,
  6789, // eski lokal API (web-admin .next önbelleğinde kalabiliyor)
  5050, 5052, 5001, 5002, 5000, 3000, 3001, 4000, 4010, 3101, 6000, 6001, 6101, 6105,
  8081, 8082, 8083, 19000, 19001,
];

if (process.platform === 'win32') {
  console.log('[ports:free] Windows: Gerekirse netstat / taskkill ile portları boşaltın.');
  process.exit(0);
}

for (const p of ports) {
  try {
    const out = execSync(`lsof -ti tcp:${p}`, { encoding: 'utf8' }).trim();
    if (!out) continue;
    const pids = [...new Set(out.split(/\n/).filter(Boolean))];
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGTERM');
      } catch {
        /* yok say */
      }
    }
    console.log(`[ports:free] ${p}: ${pids.join(', ')}`);
  } catch {
    /* dinleyen yok */
  }
}
