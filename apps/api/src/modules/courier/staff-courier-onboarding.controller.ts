import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { CourierType } from '@prisma/client';
import type { Request } from 'express';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { ListCourierApplicationsDto } from './dto/list-courier-applications.dto';
import { RejectCourierDocumentDto } from './dto/reject-courier-document.dto';
import {
  PatchCourierDocumentRequirementDto,
  UpsertCourierDocumentRequirementDto,
} from './dto/upsert-courier-document-requirement.dto';
import { StaffCourierOnboardingService } from './staff-courier-onboarding.service';

@Controller('staff/courier')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffCourierOnboardingController {
  constructor(
    private readonly staffOnboarding: StaffCourierOnboardingService,
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

  @Get('document-requirements')
  listRequirements(@Query('courierType') courierType: CourierType) {
    if (!courierType || !Object.values(CourierType).includes(courierType)) {
      return { items: [] };
    }
    return this.staffOnboarding.listRequirements(courierType).then((items) => ({ items }));
  }

  @Post('document-requirements')
  createRequirement(@Body() body: UpsertCourierDocumentRequirementDto) {
    return this.staffOnboarding.createRequirement(body);
  }

  @Patch('document-requirements/:id')
  patchRequirement(@Param('id') id: string, @Body() body: PatchCourierDocumentRequirementDto) {
    return this.staffOnboarding.patchRequirement(id.trim(), body);
  }

  @Delete('document-requirements/:id')
  deleteRequirement(@Param('id') id: string) {
    return this.staffOnboarding.deleteRequirement(id.trim());
  }

  @Get('applications')
  listApplications(@Query() query: ListCourierApplicationsDto) {
    return this.staffOnboarding.listApplications(query);
  }

  @Get('applications/:publicId')
  getApplication(@Req() req: Request, @Param('publicId') publicId: string) {
    return this.staffOnboarding.getApplication(publicId.trim(), this.publicApiOrigin(req));
  }

  @Post('applications/:publicId/requirements/:requirementId/approve')
  approveDocument(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('publicId') publicId: string,
    @Param('requirementId') requirementId: string,
  ) {
    return this.staffOnboarding.approveDocument(req.user.userId, publicId.trim(), requirementId.trim());
  }

  @Post('applications/:publicId/requirements/:requirementId/reject')
  rejectDocument(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('publicId') publicId: string,
    @Param('requirementId') requirementId: string,
    @Body() body: RejectCourierDocumentDto,
  ) {
    return this.staffOnboarding.rejectDocument(
      req.user.userId,
      publicId.trim(),
      requirementId.trim(),
      body.reason,
    );
  }

  @Post('applications/:publicId/request-revisions')
  requestRevisions(@Param('publicId') publicId: string) {
    return this.staffOnboarding.requestRevisions(publicId.trim());
  }

  @Post('applications/:publicId/approve')
  approveAccount(@Req() req: Request & { user: StaffJwtUser }, @Param('publicId') publicId: string) {
    return this.staffOnboarding.approve(req.user.userId, publicId.trim());
  }
}
