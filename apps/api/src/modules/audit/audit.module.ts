import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffAuditLogsController } from './staff-audit-logs.controller';
import { StaffAuditLogsService } from './staff-audit-logs.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffAuditLogsController],
  providers: [StaffAuditLogsService],
})
export class AuditModule {}
