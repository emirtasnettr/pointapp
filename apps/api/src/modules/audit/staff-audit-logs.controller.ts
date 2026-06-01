import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ListStaffAuditLogsDto } from './dto/list-staff-audit-logs.dto';
import { StaffAuditLogsService } from './staff-audit-logs.service';

@Controller('staff/audit-logs')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffAuditLogsController {
  constructor(private readonly auditLogs: StaffAuditLogsService) {}

  @Get()
  list(@Query() query: ListStaffAuditLogsDto) {
    return this.auditLogs.list(query);
  }
}
