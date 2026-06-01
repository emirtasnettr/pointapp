import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffFinanceController } from './staff-finance.controller';
import { StaffFinanceService } from './staff-finance.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffFinanceController],
  providers: [StaffFinanceService],
})
export class FinanceModule {}
