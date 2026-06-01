import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import { CreateStaffCampaignDto } from './dto/create-staff-campaign.dto';
import { PatchStaffCampaignDto } from './dto/patch-staff-campaign.dto';
import { StaffCampaignsService } from './staff-campaigns.service';

@Controller('staff/campaigns')
@UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
@RequirePermissions(StaffPerm.CAMPAIGNS_READ)
export class StaffCampaignsController {
  constructor(private readonly campaigns: StaffCampaignsService) {}

  @Get()
  async list() {
    const rows = await this.campaigns.list();
    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        active: r.active,
        startsAt: r.startsAt?.toISOString() ?? null,
        endsAt: r.endsAt?.toISOString() ?? null,
        maxUsesPerCustomer: r.maxUsesPerCustomer,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        totalRedemptions: r.totalRedemptions,
        uniqueCustomerCount: r.uniqueCustomerCount,
      })),
    };
  }

  @Post()
  create(@Body() body: CreateStaffCampaignDto) {
    return this.campaigns.create(body);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.campaigns.getOne(id.trim());
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() body: PatchStaffCampaignDto) {
    return this.campaigns.patch(id.trim(), body);
  }
}
