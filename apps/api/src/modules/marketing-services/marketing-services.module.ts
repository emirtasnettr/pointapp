import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { MarketingServicesService } from './marketing-services.service';
import { PublicMarketingServicesController } from './public-marketing-services.controller';
import { StaffMarketingServicesController } from './staff-marketing-services.controller';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [PublicMarketingServicesController, StaffMarketingServicesController],
  providers: [MarketingServicesService],
  exports: [MarketingServicesService],
})
export class MarketingServicesModule {}
