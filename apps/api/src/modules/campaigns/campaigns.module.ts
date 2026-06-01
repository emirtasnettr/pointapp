import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffCampaignsController } from './staff-campaigns.controller';
import { StaffCampaignsService } from './staff-campaigns.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffCampaignsController],
  providers: [StaffCampaignsService],
})
export class CampaignsModule {}
