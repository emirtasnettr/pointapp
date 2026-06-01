import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import { ListStaffReportsDto } from './dto/list-staff-reports.dto';
import { StaffReportsService } from './staff-reports.service';

@Controller('staff/reports')
@UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
@RequirePermissions(StaffPerm.REPORTS_READ)
export class StaffReportsController {
  constructor(private readonly reports: StaffReportsService) {}

  @Get('overview')
  overview(@Query() query: ListStaffReportsDto) {
    return this.reports.overview(query);
  }
}
