import { Controller, Get, Headers, NotFoundException, Param, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { LocalFilesAccessService } from './local-files-access.service';

function mimeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

@Controller('files')
export class LocalFilesController {
  constructor(
    private readonly storage: LocalStorageAdapter,
    private readonly access: LocalFilesAccessService,
  ) {}

  @Get('local/:key')
  async getLocal(
    @Param('key') key: string,
    @Headers('authorization') authorization?: string,
  ): Promise<StreamableFile> {
    let decoded: string;
    try {
      decoded = decodeURIComponent(key);
    } catch {
      throw new NotFoundException();
    }
    if (decoded.includes('..')) {
      throw new NotFoundException();
    }

    await this.access.assertMayReadLocalKey(decoded, authorization);

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
