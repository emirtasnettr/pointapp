import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import { StaffRbacService } from './staff-rbac.service';

@Controller('staff/rbac')
@UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
@RequirePermissions(StaffPerm.SETTINGS_MANAGE)
export class StaffRbacController {
  constructor(private readonly rbac: StaffRbacService) {}

  @Get('roles')
  roles() {
    return this.rbac.listRoles();
  }
}
