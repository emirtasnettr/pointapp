import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { SetCourierUserStatusDto } from '../courier/dto/set-courier-user-status.dto';
import { StaffSetPasswordDto } from '../courier/dto/staff-set-password.dto';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ListStaffUsersDto } from './dto/list-staff-users.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { StaffUsersService } from './staff-users.service';

@Controller('staff/users')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffUsersController {
  constructor(private readonly staffUsers: StaffUsersService) {}

  @Get('assignable-roles')
  assignableRoles(@Req() req: Request & { user: StaffJwtUser }) {
    return this.staffUsers.listAssignableRoles(req.user);
  }

  @Get()
  list(@Req() req: Request & { user: StaffJwtUser }, @Query() query: ListStaffUsersDto) {
    return this.staffUsers.list(req.user, query);
  }

  @Post()
  create(@Req() req: Request & { user: StaffJwtUser }, @Body() body: CreateStaffUserDto) {
    return this.staffUsers.create(req.user, body);
  }

  @Get(':userId')
  getOne(@Req() req: Request & { user: StaffJwtUser }, @Param('userId') userId: string) {
    return this.staffUsers.getOne(req.user, userId);
  }

  @Patch(':userId')
  update(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('userId') userId: string,
    @Body() body: UpdateStaffUserDto,
  ) {
    return this.staffUsers.update(req.user, userId, body);
  }

  @Patch(':userId/status')
  setStatus(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('userId') userId: string,
    @Body() body: SetCourierUserStatusDto,
  ) {
    return this.staffUsers.setStatus(req.user, userId, body.status);
  }

  @Patch(':userId/password')
  setPassword(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('userId') userId: string,
    @Body() body: StaffSetPasswordDto,
  ) {
    return this.staffUsers.setPassword(req.user, userId, body.password);
  }
}
