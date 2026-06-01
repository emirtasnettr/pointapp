#!/usr/bin/env node
/**
 * Bozuk / uyumsuz chunk hatalarını (Cannot find module './NNN.js') önlemek için .next siler.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = path.join(root, '.next');

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('[clean-next] .next kaldırıldı');
} catch (e) {
  console.warn('[clean-next] atlanıyor:', (e && e.message) || e);
}
