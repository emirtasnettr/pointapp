import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ListStaffReportsDto } from './dto/list-staff-reports.dto';
import { StaffReportsService } from './staff-reports.service';

@Controller('staff/reports')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffReportsController {
  constructor(private readonly reports: StaffReportsService) {}

  @Get('overview')
  overview(@Query() query: ListStaffReportsDto) {
    return this.reports.overview(query);
  }
}
