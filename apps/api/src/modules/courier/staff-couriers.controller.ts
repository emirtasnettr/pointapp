import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateStaffCourierDto } from './dto/create-staff-courier.dto';
import { ListStaffCouriersDto } from './dto/list-staff-couriers.dto';
import { SetCourierUserStatusDto } from './dto/set-courier-user-status.dto';
import { StaffSetPasswordDto } from './dto/staff-set-password.dto';
import { StaffCouriersService } from './staff-couriers.service';

@Controller('staff/couriers')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffCouriersController {
  constructor(private readonly staffCouriers: StaffCouriersService) {}

  @Get()
  list(@Query() query: ListStaffCouriersDto) {
    return this.staffCouriers.list(query);
  }

  @Post()
  create(@Body() body: CreateStaffCourierDto) {
    return this.staffCouriers.create(body);
  }

  @Patch(':publicId/status')
  setStatus(@Param('publicId') publicId: string, @Body() body: SetCourierUserStatusDto) {
    return this.staffCouriers.setUserStatus(publicId, body);
  }

  @Patch(':publicId/password')
  setPassword(@Param('publicId') publicId: string, @Body() body: StaffSetPasswordDto) {
    return this.staffCouriers.setPassword(publicId, body.password);
  }

  @Get(':publicId')
  get(@Param('publicId') publicId: string) {
    return this.staffCouriers.getByPublicId(publicId);
  }
}
