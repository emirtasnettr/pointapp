import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { PublicBrandController } from './public-brand.controller';
import { PublicCourierCompanyTaxController } from './public-courier-company-tax.controller';
import { StaffRbacController } from './staff-rbac.controller';
import { StaffRbacService } from './staff-rbac.service';
import { StaffSettingsController } from './staff-settings.controller';
import { StaffSettingsService } from './staff-settings.service';
import { StaffUsersController } from './staff-users.controller';
import { StaffUsersService } from './staff-users.service';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [
    StaffSettingsController,
    StaffRbacController,
    StaffUsersController,
    PublicBrandController,
    PublicCourierCompanyTaxController,
  ],
  providers: [StaffSettingsService, StaffRbacService, StaffUsersService, SystemConfigService],
  exports: [SystemConfigService],
})
export class SettingsModule {}
