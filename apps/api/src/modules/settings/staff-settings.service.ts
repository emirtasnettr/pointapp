import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  apiOriginFromConfig,
  resolvePublicFileUrl,
} from '../../common/resolve-public-file-url';
import { AppRole, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import sizeOf from 'image-size';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { PrismaService } from '../../prisma/prisma.service';
import { PatchStaffSettingsDto } from './dto/patch-staff-settings.dto';

/** Ayar anahtarları — değerler JSON (sayı, metin). */
export const SETTING_KEYS = [
  'system.commissionDefaultPct',
  'system.nightTariffStart',
  'system.nightTariffEnd',
  'system.supportLinePhone',
  'system.companyLegalTitle',
  'system.companyTaxNumber',
  'system.companyTaxOffice',
  'system.companyAddress',
  'system.companyEmail',
  'system.companyPhone',
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
  'sms.provider',
  'sms.header',
  'sms.apiUser',
  'sms.apiPass',
  'payment.provider',
  'payment.paytrMerchantId',
  'payment.paytrMerchantKey',
  'payment.iyziApiKey',
  'payment.iyziSecretKey',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

const KEY_SET = new Set<string>(SETTING_KEYS);

function isSensitiveKey(key: string): boolean {
  return /Pass$|Key$|Secret$|Token$/i.test(key);
}

function maskValue(key: string, raw: Prisma.JsonValue): Prisma.JsonValue {
  if (!isSensitiveKey(key)) return raw;
  if (raw === null || raw === undefined) return raw;
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (!s || s === '""') return raw;
  return '••••••••';
}

function assertSystemAdmin(u: StaffJwtUser) {
  if (u.appRole !== AppRole.SYSTEM_ADMIN) {
    throw new ForbiddenException('Yalnızca sistem yöneticisi ayarları görüntüleyebilir veya değiştirebilir.');
  }
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

function isValidTimeHm(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s.trim());
}

@Injectable()
export class StaffSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageAdapter,
    private readonly config: ConfigService,
  ) {}

  private apiOrigin(): string {
    return apiOriginFromConfig(
      this.config.get<string>('PUBLIC_API_ORIGIN'),
      this.config.get<string>('PORT') ?? process.env.PORT,
    );
  }

  private rewritePublicFileValues(values: Record<string, Prisma.JsonValue>): Record<string, Prisma.JsonValue> {
    const origin = this.apiOrigin();
    for (const key of [
      'brand.logoLightUrl',
      'brand.logoDarkUrl',
      'marketing.heroImageUrl',
      'marketing.customerShowcaseImageUrl',
    ] as const) {
      const raw = values[key];
      if (typeof raw === 'string' && raw.trim()) {
        values[key] = resolvePublicFileUrl(raw, origin) ?? raw;
      }
    }
    return values;
  }

  async getAll(actor: StaffJwtUser) {
    assertSystemAdmin(actor);
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
      orderBy: { key: 'asc' },
    });
    const values: Record<string, Prisma.JsonValue> = {};
    for (const k of SETTING_KEYS) {
      values[k] = null;
    }
    for (const r of rows) {
      if (KEY_SET.has(r.key)) {
        values[r.key] = maskValue(r.key, r.value);
      }
    }
    let latest: string | null = null;
    for (const r of rows) {
      const t = r.updatedAt.toISOString();
      if (!latest || t > latest) latest = t;
    }
    return {
      keys: [...SETTING_KEYS],
      values: this.rewritePublicFileValues(values),
      updatedAt: latest,
    };
  }

  async patch(actor: StaffJwtUser, dto: PatchStaffSettingsDto) {
    assertSystemAdmin(actor);
    const incoming = dto.values ?? {};
    const entries = Object.entries(incoming).filter(([k]) => KEY_SET.has(k));

    for (const [key, raw] of entries) {
      if (raw === undefined) continue;
      if (isSensitiveKey(key)) {
        const s = asString(raw);
        if (s === null || s.trim() === '' || s.trim() === '••••••••') continue;
      }
      const validated = this.validateKeyValue(key as SettingKey, raw);
      await this.prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: validated as Prisma.InputJsonValue, updatedByUserId: actor.userId },
        update: { value: validated as Prisma.InputJsonValue, updatedByUserId: actor.userId },
      });
    }

    return this.getAll(actor);
  }

  async uploadBrandLogo(
    actor: StaffJwtUser,
    variant: 'light' | 'dark',
    file: { buffer: Buffer; mimetype: string; size: number },
    publicOrigin: string,
  ) {
    assertSystemAdmin(actor);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    const mime = file.mimetype;
    const extByMime: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };
    const ext = extByMime[mime];
    if (!ext) {
      throw new BadRequestException('Yalnızca PNG, JPEG, WebP veya SVG yükleyebilirsiniz');
    }
    const safeVariant = variant === 'dark' ? 'dark' : 'light';
    const key = `brand-logo-${safeVariant}-${randomUUID()}${ext}`;
    const stored = await this.storage.putObject(key, file.buffer, { mime, acl: 'public-read' });
    const kind = safeVariant === 'light' ? 'brand_logo_light' : 'brand_logo_dark';

    const olds = await this.prisma.fileAsset.findMany({
      where: { ownerType: 'system', kind },
    });
    for (const o of olds) {
      await this.storage.deleteObject(o.path);
      await this.prisma.fileAsset.delete({ where: { id: o.id } });
    }

    await this.prisma.fileAsset.create({
      data: {
        ownerType: 'system',
        ownerId: null,
        kind,
        path: stored.key,
        mime: stored.mime ?? mime,
        size: file.size,
      },
    });

    const origin = publicOrigin.replace(/\/$/, '');
    const publicUrl = `${origin}${stored.url}`;

    const settingKey = safeVariant === 'light' ? 'brand.logoLightUrl' : 'brand.logoDarkUrl';
    await this.prisma.systemSetting.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value: publicUrl, updatedByUserId: actor.userId },
      update: { value: publicUrl, updatedByUserId: actor.userId },
    });
    return this.getAll(actor);
  }

  async uploadMarketingHeroImage(
    actor: StaffJwtUser,
    file: { buffer: Buffer; mimetype: string; size: number },
    publicOrigin: string,
  ) {
    assertSystemAdmin(actor);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    const mime = file.mimetype;
    const extByMime: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
    };
    const ext = extByMime[mime];
    if (!ext) {
      throw new BadRequestException('Yalnızca PNG, JPEG veya WebP yükleyebilirsiniz');
    }
    const dims = sizeOf(file.buffer);
    const width = dims.width ?? null;
    const height = dims.height ?? null;
    if (!width || !height) {
      throw new BadRequestException('Görsel boyutları okunamadı');
    }

    const key = `marketing-hero-${randomUUID()}${ext}`;
    const stored = await this.storage.putObject(key, file.buffer, { mime, acl: 'public-read' });
    const kind = 'marketing_hero';

    const olds = await this.prisma.fileAsset.findMany({
      where: { ownerType: 'system', kind },
    });
    for (const o of olds) {
      await this.storage.deleteObject(o.path);
      await this.prisma.fileAsset.delete({ where: { id: o.id } });
    }

    await this.prisma.fileAsset.create({
      data: {
        ownerType: 'system',
        ownerId: null,
        kind,
        path: stored.key,
        mime: stored.mime ?? mime,
        size: file.size,
      },
    });

    const origin = publicOrigin.replace(/\/$/, '');
    const publicUrl = `${origin}${stored.url}`;

    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({
        where: { key: 'marketing.heroImageUrl' },
        create: {
          key: 'marketing.heroImageUrl',
          value: publicUrl,
          updatedByUserId: actor.userId,
        },
        update: { value: publicUrl, updatedByUserId: actor.userId },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'marketing.heroImageWidth' },
        create: {
          key: 'marketing.heroImageWidth',
          value: width,
          updatedByUserId: actor.userId,
        },
        update: { value: width, updatedByUserId: actor.userId },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'marketing.heroImageHeight' },
        create: {
          key: 'marketing.heroImageHeight',
          value: height,
          updatedByUserId: actor.userId,
        },
        update: { value: height, updatedByUserId: actor.userId },
      }),
    ]);

    return this.getAll(actor);
  }

  async uploadMarketingCustomerShowcaseImage(
    actor: StaffJwtUser,
    file: { buffer: Buffer; mimetype: string; size: number },
    publicOrigin: string,
  ) {
    assertSystemAdmin(actor);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya gerekli');
    }
    const mime = file.mimetype;
    const extByMime: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
    };
    const ext = extByMime[mime];
    if (!ext) {
      throw new BadRequestException('Yalnızca PNG, JPEG veya WebP yükleyebilirsiniz');
    }
    const dims = sizeOf(file.buffer);
    const width = dims.width ?? null;
    const height = dims.height ?? null;
    if (!width || !height) {
      throw new BadRequestException('Görsel boyutları okunamadı');
    }

    const key = `marketing-customer-showcase-${randomUUID()}${ext}`;
    const stored = await this.storage.putObject(key, file.buffer, { mime, acl: 'public-read' });
    const kind = 'marketing_customer_showcase';

    const olds = await this.prisma.fileAsset.findMany({
      where: { ownerType: 'system', kind },
    });
    for (const o of olds) {
      await this.storage.deleteObject(o.path);
      await this.prisma.fileAsset.delete({ where: { id: o.id } });
    }

    await this.prisma.fileAsset.create({
      data: {
        ownerType: 'system',
        ownerId: null,
        kind,
        path: stored.key,
        mime: stored.mime ?? mime,
        size: file.size,
      },
    });

    const origin = publicOrigin.replace(/\/$/, '');
    const publicUrl = `${origin}${stored.url}`;

    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({
        where: { key: 'marketing.customerShowcaseImageUrl' },
        create: {
          key: 'marketing.customerShowcaseImageUrl',
          value: publicUrl,
          updatedByUserId: actor.userId,
        },
        update: { value: publicUrl, updatedByUserId: actor.userId },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'marketing.customerShowcaseImageWidth' },
        create: {
          key: 'marketing.customerShowcaseImageWidth',
          value: width,
          updatedByUserId: actor.userId,
        },
        update: { value: width, updatedByUserId: actor.userId },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: 'marketing.customerShowcaseImageHeight' },
        create: {
          key: 'marketing.customerShowcaseImageHeight',
          value: height,
          updatedByUserId: actor.userId,
        },
        update: { value: height, updatedByUserId: actor.userId },
      }),
    ]);

    return this.getAll(actor);
  }

  private validateKeyValue(key: SettingKey, raw: unknown): Prisma.JsonValue {
    switch (key) {
      case 'system.commissionDefaultPct': {
        const n = asNumber(raw);
        if (n === null || n < 0 || n > 100) {
          throw new BadRequestException('system.commissionDefaultPct: 0–100 arası sayı olmalıdır');
        }
        return n;
      }
      case 'system.nightTariffStart':
      case 'system.nightTariffEnd': {
        const s = asString(raw)?.trim() ?? '';
        if (!isValidTimeHm(s)) {
          throw new BadRequestException(`${key}: SS:dd formatında saat (ör. 22:00)`);
        }
        return s;
      }
      case 'system.supportLinePhone':
      case 'system.companyPhone': {
        const s = asString(raw)?.trim() ?? '';
        if (s === '') return '';
        const digits = s.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) {
          throw new BadRequestException(`${key}: geçerli bir telefon numarası girin (en az 10 rakam)`);
        }
        return s;
      }
      case 'system.companyLegalTitle': {
        const s = asString(raw)?.trim() ?? '';
        if (s.length > 200) {
          throw new BadRequestException('system.companyLegalTitle: en fazla 200 karakter');
        }
        return s;
      }
      case 'system.companyTaxNumber': {
        const s = asString(raw)?.trim() ?? '';
        if (s.length > 20) {
          throw new BadRequestException('system.companyTaxNumber: en fazla 20 karakter');
        }
        return s;
      }
      case 'system.companyTaxOffice': {
        const s = asString(raw)?.trim() ?? '';
        if (s.length > 120) {
          throw new BadRequestException('system.companyTaxOffice: en fazla 120 karakter');
        }
        return s;
      }
      case 'system.companyAddress': {
        const s = asString(raw)?.trim() ?? '';
        if (s.length > 500) {
          throw new BadRequestException('system.companyAddress: en fazla 500 karakter');
        }
        return s;
      }
      case 'system.companyEmail': {
        const s = asString(raw)?.trim() ?? '';
        if (s === '') return '';
        if (s.length > 120) {
          throw new BadRequestException('system.companyEmail: en fazla 120 karakter');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
          throw new BadRequestException('system.companyEmail: geçerli bir e-posta girin');
        }
        return s;
      }
      case 'brand.logoLightUrl':
      case 'brand.logoDarkUrl':
      case 'marketing.heroImageUrl':
      case 'marketing.customerShowcaseImageUrl': {
        const s = asString(raw)?.trim() ?? '';
        if (s === '') return '';
        try {
          const u = new URL(s);
          if (u.protocol !== 'https:' && u.protocol !== 'http:') {
            throw new BadRequestException('Geçersiz URL şeması');
          }
        } catch {
          throw new BadRequestException(`${key}: geçerli bir http(s) URL girin veya boş bırakın`);
        }
        return s;
      }
      case 'marketing.heroImageWidth':
      case 'marketing.heroImageHeight':
      case 'marketing.customerShowcaseImageWidth':
      case 'marketing.customerShowcaseImageHeight': {
        const n = asNumber(raw);
        if (n === null || n < 1 || n > 20000) {
          throw new BadRequestException(`${key}: 1–20000 arası piksel olmalıdır`);
        }
        return Math.round(n);
      }
      case 'marketing.appStoreUrl':
      case 'marketing.googlePlayUrl': {
        const s = asString(raw)?.trim() ?? '';
        if (s === '') return '';
        try {
          const u = new URL(s);
          if (u.protocol !== 'https:' && u.protocol !== 'http:') {
            throw new BadRequestException('Geçersiz URL şeması');
          }
        } catch {
          throw new BadRequestException(`${key}: geçerli bir http(s) URL girin veya boş bırakın`);
        }
        return s;
      }
      case 'sms.provider': {
        const s = (asString(raw)?.trim().toLowerCase() ?? 'netgsm') || 'netgsm';
        if (!['netgsm', 'mock', 'none'].includes(s)) {
          throw new BadRequestException('sms.provider: netgsm, mock veya none');
        }
        return s;
      }
      case 'sms.header':
      case 'sms.apiUser': {
        const s = asString(raw)?.trim() ?? '';
        if (s.length > 40) throw new BadRequestException(`${key}: en fazla 40 karakter`);
        return s;
      }
      case 'sms.apiPass': {
        const s = asString(raw)?.trim() ?? '';
        if (s.length > 120) throw new BadRequestException('sms.apiPass: en fazla 120 karakter');
        return s;
      }
      case 'payment.provider': {
        const s = (asString(raw)?.trim().toLowerCase() ?? 'none') || 'none';
        if (!['none', 'paytr', 'iyzico', 'mock'].includes(s)) {
          throw new BadRequestException('payment.provider: none, paytr, iyzico veya mock');
        }
        return s;
      }
      case 'payment.paytrMerchantId':
      case 'payment.iyziApiKey': {
        const s = asString(raw)?.trim() ?? '';
        if (s.length > 200) throw new BadRequestException(`${key}: en fazla 200 karakter`);
        return s;
      }
      case 'payment.paytrMerchantKey':
      case 'payment.iyziSecretKey': {
        const s = asString(raw)?.trim() ?? '';
        if (s.length > 500) throw new BadRequestException(`${key}: en fazla 500 karakter`);
        return s;
      }
      default:
        throw new BadRequestException(`Desteklenmeyen anahtar: ${String(key)}`);
    }
  }
}
