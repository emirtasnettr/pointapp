import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicCourierLegalPagesController } from './public-courier-legal-pages.controller';
import { PublicLegalPagesController } from './public-legal-pages.controller';
import { StaffCourierLegalPagesController } from './staff-courier-legal-pages.controller';
import { StaffLegalPagesController } from './staff-legal-pages.controller';
import { LegalPagesService } from './legal-pages.service';

@Module({
  imports: [AuthModule],
  controllers: [
    PublicLegalPagesController,
    PublicCourierLegalPagesController,
    StaffLegalPagesController,
    StaffCourierLegalPagesController,
  ],
  providers: [LegalPagesService],
  exports: [LegalPagesService],
})
export class LegalModule {}
