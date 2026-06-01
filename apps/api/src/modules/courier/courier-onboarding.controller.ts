import {
  BadRequestException,
  Body,
  Controller,
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
import type { CourierJwtUser } from '../auth/strategies/courier-jwt.strategy';
import { CourierOnboardingService } from './courier-onboarding.service';
import { CourierOnboardingTextDto } from './dto/courier-onboarding-text.dto';

type MultipartFile = { buffer: Buffer; mimetype: string; size: number };

@Controller('courier/me/onboarding')
@UseGuards(AuthGuard('courier-jwt'))
export class CourierOnboardingController {
  constructor(
    private readonly onboarding: CourierOnboardingService,
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
  getState(@Req() req: Request & { user: CourierJwtUser }) {
    return this.onboarding.getState(req.user.userId, this.publicApiOrigin(req));
  }

  @Patch('requirements/:requirementId/text')
  saveText(
    @Req() req: Request & { user: CourierJwtUser },
    @Param('requirementId') requirementId: string,
    @Body() body: CourierOnboardingTextDto,
  ) {
    return this.onboarding.saveText(req.user.userId, requirementId.trim(), body.textValue);
  }

  @Post('requirements/:requirementId/file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadFile(
    @Req() req: Request & { user: CourierJwtUser },
    @Param('requirementId') requirementId: string,
    @UploadedFile() file: MultipartFile | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    return this.onboarding.uploadFile(
      req.user.userId,
      requirementId.trim(),
      file,
      this.publicApiOrigin(req),
    );
  }

  @Post('submit')
  submit(@Req() req: Request & { user: CourierJwtUser }) {
    return this.onboarding.submitForReview(req.user.userId);
  }
}
