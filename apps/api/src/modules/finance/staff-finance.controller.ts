import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StaffFinanceService } from './staff-finance.service';

@Controller('staff/finance')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffFinanceController {
  constructor(private readonly finance: StaffFinanceService) {}

  @Get('overview')
  overview() {
    return this.finance.overview();
  }
}
