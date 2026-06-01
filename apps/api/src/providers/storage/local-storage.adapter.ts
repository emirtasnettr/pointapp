import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { StorageProvider, StoredObject } from './storage.provider';

/** Local disk adapter — prod'da volume mount; sonra S3/MinIO adapter aynı interface. */
export class LocalStorageAdapter implements StorageProvider {
  constructor(private readonly baseDir: string) {}

  /** Okuma yolu (path traversal kontrolü için). */
  resolveSafePath(key: string): string {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const full = path.join(this.baseDir, normalized);
    const root = path.resolve(this.baseDir);
    if (!full.startsWith(root)) {
      throw new Error('invalid_key');
    }
    return full;
  }

  async putObject(
    key: string,
    body: Buffer | Readable,
    opts: { mime: string; acl?: 'private' | 'public-read' },
  ): Promise<StoredObject> {
    const full = this.resolveSafePath(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    if (Buffer.isBuffer(body)) {
      await fs.writeFile(full, body);
    } else {
      await pipeline(body, createWriteStream(full));
    }
    return {
      key,
      url: `/v1/files/local/${encodeURIComponent(key)}`,
      mime: opts.mime,
      size: Buffer.isBuffer(body) ? body.length : undefined,
    };
  }

  async getSignedUrl(key: string, _expiresSeconds: number): Promise<string> {
    void _expiresSeconds;
    return `/v1/files/local/${encodeURIComponent(key)}`;
  }

  async deleteObject(key: string): Promise<void> {
    const full = this.resolveSafePath(key);
    await fs.unlink(full).catch(() => undefined);
  }
}
