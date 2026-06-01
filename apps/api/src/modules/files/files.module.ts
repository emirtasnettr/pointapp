import path from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { LocalFilesController } from './local-files.controller';

@Module({
  imports: [ConfigModule],
  controllers: [LocalFilesController],
  providers: [
    {
      provide: LocalStorageAdapter,
      useFactory: (config: ConfigService) => {
        const dir =
          config.get<string>('STORAGE_LOCAL_DIR')?.trim() ||
          path.join(process.cwd(), 'storage', 'uploads');
        return new LocalStorageAdapter(dir);
      },
      inject: [ConfigService],
    },
  ],
  exports: [LocalStorageAdapter],
})
export class FilesModule {}
