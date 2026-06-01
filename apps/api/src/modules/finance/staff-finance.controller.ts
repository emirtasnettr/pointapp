import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import { StaffFinanceService } from './staff-finance.service';

@Controller('staff/finance')
@UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
@RequirePermissions(StaffPerm.FINANCE_READ)
export class StaffFinanceController {
  constructor(private readonly finance: StaffFinanceService) {}

  @Get('overview')
  overview() {
    return this.finance.overview();
  }
}
