import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { MarketingCampaignsService } from './marketing-campaigns.service';
import { PublicMarketingCampaignsController } from './public-marketing-campaigns.controller';
import { StaffMarketingCampaignsController } from './staff-marketing-campaigns.controller';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [PublicMarketingCampaignsController, StaffMarketingCampaignsController],
  providers: [MarketingCampaignsService],
  exports: [MarketingCampaignsService],
})
export class MarketingCampaignsModule {}
