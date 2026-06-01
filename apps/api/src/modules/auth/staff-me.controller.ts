import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { StaffJwtUser } from './strategies/staff-jwt.strategy';

@Controller('staff')
export class StaffMeController {
  @Get('me')
  @UseGuards(AuthGuard('staff-jwt'))
  me(@Req() req: Request & { user: StaffJwtUser }) {
    const u = req.user;
    return {
      userId: u.userId,
      staffProfileId: u.staffProfileId,
      appRole: u.appRole,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
    };
  }
}
