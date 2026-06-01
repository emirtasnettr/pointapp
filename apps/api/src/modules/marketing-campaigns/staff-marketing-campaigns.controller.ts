import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import type { Request } from 'express';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { CreateMarketingCampaignDto } from './dto/create-marketing-campaign.dto';
import { PatchMarketingCampaignDto } from './dto/patch-marketing-campaign.dto';
import { MarketingCampaignsService } from './marketing-campaigns.service';

type MultipartFile = { buffer: Buffer; mimetype: string; size: number };

@Controller('staff/marketing-campaigns')
@UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
@RequirePermissions(StaffPerm.MARKETING_MANAGE)
export class StaffMarketingCampaignsController {
  constructor(
    private readonly campaigns: MarketingCampaignsService,
    private readonly config: ConfigService,
  ) {}

  private publicApiOrigin(req: Request): string {
    const fromEnv = this.config.get<string>('PUBLIC_API_ORIGIN')?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    const xfProto = req.get('x-forwarded-proto');
    const proto = (xfProto?.split(',')[0].trim() || req.protocol || 'http').replace(/:$/, '');
    const xfHost = req.get('x-forwarded-host');
    const host = xfHost?.split(',')[0].trim() || req.get('host');
    if (host) return `${proto}://${host}`.replace(/\/$/, '');
    const port = this.config.get<string>('PORT') ?? process.env.PORT ?? '5001';
    return `http://localhost:${port}`;
  }

  @Get()
  list(@Req() req: Request & { user: StaffJwtUser }) {
    return this.campaigns.listStaff(req.user);
  }

  @Post()
  create(@Req() req: Request & { user: StaffJwtUser }, @Body() body: CreateMarketingCampaignDto) {
    return this.campaigns.createStaff(req.user, body);
  }

  @Patch(':id')
  patch(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('id') id: string,
    @Body() body: PatchMarketingCampaignDto,
  ) {
    return this.campaigns.patchStaff(req.user, id.trim(), body);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user: StaffJwtUser }, @Param('id') id: string) {
    return this.campaigns.deleteStaff(req.user, id.trim());
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('id') id: string,
    @UploadedFile() file: MultipartFile | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    return this.campaigns.uploadImageStaff(req.user, id.trim(), file, this.publicApiOrigin(req));
  }
}
