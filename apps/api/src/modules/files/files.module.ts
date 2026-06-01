import path from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { LocalFilesAccessService } from './local-files-access.service';
import { LocalFilesController } from './local-files.controller';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [LocalFilesController],
  providers: [
    LocalFilesAccessService,
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
