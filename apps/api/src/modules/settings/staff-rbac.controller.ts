import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StaffRbacService } from './staff-rbac.service';

@Controller('staff/rbac')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffRbacController {
  constructor(private readonly rbac: StaffRbacService) {}

  @Get('roles')
  roles() {
    return this.rbac.listRoles();
  }
}
