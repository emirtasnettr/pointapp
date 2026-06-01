import { Controller, Get, NotFoundException, Param, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';

function mimeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

/** Kimlik doğrulamasız: yalnızca yükleme dizinindeki nesneler (logo vb.). */
@Controller('files')
export class LocalFilesController {
  constructor(private readonly storage: LocalStorageAdapter) {}

  @Get('local/:key')
  getLocal(@Param('key') key: string): StreamableFile {
    let decoded: string;
    try {
      decoded = decodeURIComponent(key);
    } catch {
      throw new NotFoundException();
    }
    if (decoded.includes('..')) {
      throw new NotFoundException();
    }
    let full: string;
    try {
      full = this.storage.resolveSafePath(decoded);
    } catch {
      throw new NotFoundException();
    }
    if (!existsSync(full)) {
      throw new NotFoundException();
    }
    const stream = createReadStream(full);
    const mime = mimeFromName(decoded);
    return new StreamableFile(stream, { type: mime });
  }
}
