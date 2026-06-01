import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { PatchStaffSettingsDto } from './dto/patch-staff-settings.dto';
import { StaffSettingsService } from './staff-settings.service';

type LogoMultipartFile = { buffer: Buffer; mimetype: string; size: number };

@Controller('staff/settings')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffSettingsController {
  constructor(
    private readonly settings: StaffSettingsService,
    private readonly config: ConfigService,
  ) {}

  /** Logo URL’si: önce PUBLIC_API_ORIGIN, yoksa istek Host (127.0.0.1 vs localhost uyumu). */
  private publicApiOrigin(req: Request): string {
    const fromEnv = this.config.get<string>('PUBLIC_API_ORIGIN')?.trim();
    if (fromEnv) {
      return fromEnv.replace(/\/$/, '');
    }
    const xfProto = req.get('x-forwarded-proto');
    const proto = (xfProto?.split(',')[0].trim() || req.protocol || 'http').replace(/:$/, '');
    const xfHost = req.get('x-forwarded-host');
    const host = xfHost?.split(',')[0].trim() || req.get('host');
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
    const port = this.config.get<string>('PORT') ?? process.env.PORT ?? '5001';
    return `http://localhost:${port}`;
  }

  @Get()
  get(@Req() req: Request & { user: StaffJwtUser }) {
    return this.settings.getAll(req.user);
  }

  @Patch()
  patch(@Req() req: Request & { user: StaffJwtUser }, @Body() body: PatchStaffSettingsDto) {
    return this.settings.patch(req.user, body);
  }

  @Post('logo/:variant')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadLogo(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('variant') variant: string,
    @UploadedFile() file: LogoMultipartFile | undefined,
  ) {
    const v = variant.trim().toLowerCase();
    if (v !== 'light' && v !== 'dark') {
      throw new BadRequestException('variant: light veya dark olmalıdır');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    return this.settings.uploadBrandLogo(req.user, v, file, this.publicApiOrigin(req));
  }

  @Post('marketing-hero')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadMarketingHero(
    @Req() req: Request & { user: StaffJwtUser },
    @UploadedFile() file: LogoMultipartFile | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    return this.settings.uploadMarketingHeroImage(req.user, file, this.publicApiOrigin(req));
  }

  @Post('marketing-customer-showcase')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadMarketingCustomerShowcase(
    @Req() req: Request & { user: StaffJwtUser },
    @UploadedFile() file: LogoMultipartFile | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    return this.settings.uploadMarketingCustomerShowcaseImage(
      req.user,
      file,
      this.publicApiOrigin(req),
    );
  }
}
