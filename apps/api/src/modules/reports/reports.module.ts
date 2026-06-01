import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffReportsController } from './staff-reports.controller';
import { StaffReportsService } from './staff-reports.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffReportsController],
  providers: [StaffReportsService],
})
export class ReportsModule {}
