import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  apiOriginFromConfig,
  resolvePublicFileUrl,
} from '../../common/resolve-public-file-url';
import { PrismaService } from '../../prisma/prisma.service';

function jsonString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function jsonNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v);
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return null;
}

/** Kimlik doğrulamasız: müşteri web ve giriş ekranları için logo URL’leri. */
@Controller('public')
export class PublicBrandController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('brand')
  async brand() {
    const origin = apiOriginFromConfig(
      this.config.get<string>('PUBLIC_API_ORIGIN'),
      this.config.get<string>('PORT') ?? process.env.PORT,
    );
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'brand.logoLightUrl',
            'brand.logoDarkUrl',
            'marketing.heroImageUrl',
            'marketing.heroImageWidth',
            'marketing.heroImageHeight',
            'marketing.customerShowcaseImageUrl',
            'marketing.customerShowcaseImageWidth',
            'marketing.customerShowcaseImageHeight',
            'marketing.appStoreUrl',
            'marketing.googlePlayUrl',
          ],
        },
      },
      select: { key: true, value: true },
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      logoLightUrl: resolvePublicFileUrl(jsonString(byKey['brand.logoLightUrl']), origin),
      logoDarkUrl: resolvePublicFileUrl(jsonString(byKey['brand.logoDarkUrl']), origin),
      heroImage: {
        url: resolvePublicFileUrl(jsonString(byKey['marketing.heroImageUrl']), origin),
        width: jsonNumber(byKey['marketing.heroImageWidth']),
        height: jsonNumber(byKey['marketing.heroImageHeight']),
      },
      customerShowcase: {
        url: resolvePublicFileUrl(jsonString(byKey['marketing.customerShowcaseImageUrl']), origin),
        width: jsonNumber(byKey['marketing.customerShowcaseImageWidth']),
        height: jsonNumber(byKey['marketing.customerShowcaseImageHeight']),
      },
      appStoreUrl: jsonString(byKey['marketing.appStoreUrl']),
      googlePlayUrl: jsonString(byKey['marketing.googlePlayUrl']),
    };
  }
}
