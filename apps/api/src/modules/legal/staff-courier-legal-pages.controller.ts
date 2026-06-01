import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import type { Request } from 'express';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { PatchLegalPageDto } from './dto/patch-legal-page.dto';
import { LegalPagesService } from './legal-pages.service';

@Controller('staff/courier/legal-pages')
@UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
@RequirePermissions(StaffPerm.SETTINGS_MANAGE)
export class StaffCourierLegalPagesController {
  constructor(private readonly legal: LegalPagesService) {}

  @Get()
  list(@Req() req: Request & { user: StaffJwtUser }) {
    return this.legal.listStaff(req.user, 'courier');
  }

  @Patch(':slug')
  patch(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('slug') slug: string,
    @Body() body: PatchLegalPageDto,
  ) {
    return this.legal.patchStaff(req.user, 'courier', slug, body.html);
  }
}
