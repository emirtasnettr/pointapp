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
import type { Request } from 'express';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { CreateMarketingServiceDto } from './dto/create-marketing-service.dto';
import { PatchMarketingServiceDto } from './dto/patch-marketing-service.dto';
import { MarketingServicesService } from './marketing-services.service';

type MultipartFile = { buffer: Buffer; mimetype: string; size: number };

@Controller('staff/marketing-services')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffMarketingServicesController {
  constructor(
    private readonly services: MarketingServicesService,
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
    return this.services.listStaff(req.user);
  }

  @Post()
  create(@Req() req: Request & { user: StaffJwtUser }, @Body() body: CreateMarketingServiceDto) {
    return this.services.createStaff(req.user, body);
  }

  @Patch(':id')
  patch(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('id') id: string,
    @Body() body: PatchMarketingServiceDto,
  ) {
    return this.services.patchStaff(req.user, id.trim(), body);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user: StaffJwtUser }, @Param('id') id: string) {
    return this.services.deleteStaff(req.user, id.trim());
  }

  @Post(':id/icon')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadIcon(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('id') id: string,
    @UploadedFile() file: MultipartFile | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    return this.services.uploadIconStaff(req.user, id.trim(), file, this.publicApiOrigin(req));
  }
}
