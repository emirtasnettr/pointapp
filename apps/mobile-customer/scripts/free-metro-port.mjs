#!/usr/bin/env node
/** Metro varsayılan portunu (8081) boşaltır — çift Expo örneğini önler. */
import { execSync } from 'node:child_process';
import process from 'node:process';

const port = process.env.EXPO_METRO_PORT || '8081';

if (process.platform === 'win32') {
  process.exit(0);
}

try {
  const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
  if (!out) process.exit(0);
  for (const pid of [...new Set(out.split(/\n/).filter(Boolean))]) {
    try {
      process.kill(Number(pid), 'SIGTERM');
    } catch {
      /* yok say */
    }
  }
  console.log(`[mobile-customer] Port ${port} serbest bırakıldı (${out.replace(/\n/g, ', ')})`);
} catch {
  /* dinleyen yok */
}
