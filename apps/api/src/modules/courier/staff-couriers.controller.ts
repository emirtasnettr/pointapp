import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import { CreateStaffCourierDto } from './dto/create-staff-courier.dto';
import { ListStaffCouriersDto } from './dto/list-staff-couriers.dto';
import { SetCourierUserStatusDto } from './dto/set-courier-user-status.dto';
import { StaffSetPasswordDto } from './dto/staff-set-password.dto';
import { StaffCouriersService } from './staff-couriers.service';

@Controller('staff/couriers')
@UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
@RequirePermissions(StaffPerm.DELIVERIES_READ)
export class StaffCouriersController {
  constructor(private readonly staffCouriers: StaffCouriersService) {}

  @Get()
  list(@Query() query: ListStaffCouriersDto) {
    return this.staffCouriers.list(query);
  }

  @Post()
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  create(@Body() body: CreateStaffCourierDto) {
    return this.staffCouriers.create(body);
  }

  @Patch(':publicId/status')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  setStatus(@Param('publicId') publicId: string, @Body() body: SetCourierUserStatusDto) {
    return this.staffCouriers.setUserStatus(publicId, body);
  }

  @Patch(':publicId/password')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  setPassword(@Param('publicId') publicId: string, @Body() body: StaffSetPasswordDto) {
    return this.staffCouriers.setPassword(publicId, body.password);
  }

  @Get(':publicId')
  get(@Param('publicId') publicId: string) {
    return this.staffCouriers.getByPublicId(publicId);
  }
}
