import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import { StatsService } from './stats.service';
import type { CourierJwtUser } from '../auth/strategies/courier-jwt.strategy';

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('dashboard')
  @UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
  @RequirePermissions(StaffPerm.DELIVERIES_READ)
  dashboard() {
    return this.stats.dashboard();
  }

  @Get('courier-demo')
  courierDemo(@Query('publicId') publicId?: string) {
    const id = publicId?.trim() || 'BK000001';
    return this.stats.courierDemo(id);
  }

  @Get('courier/me')
  @UseGuards(AuthGuard('courier-jwt'))
  courierMe(@Req() req: Request & { user: CourierJwtUser }) {
    return this.stats.courierMeForUser(req.user.userId);
  }

  @Get('courier/history')
  @UseGuards(AuthGuard('courier-jwt'))
  courierHistory(
    @Req() req: Request & { user: CourierJwtUser },
    @Query('period') period?: string,
  ) {
    return this.stats.courierHistoryForUser(req.user.userId, period);
  }
}
