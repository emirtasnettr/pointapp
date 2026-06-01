import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppRole, Prisma } from '@prisma/client';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { assertRichHtmlLength } from '../../common/html-sanitize';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getLegalPageDefForAudience,
  isLegalPageSlugForAudience,
  legalPagesForAudience,
  type LegalAudience,
} from './legal-audience';

function assertSystemAdmin(u: StaffJwtUser) {
  if (u.appRole !== AppRole.SYSTEM_ADMIN) {
    throw new ForbiddenException('Yalnızca sistem yöneticisi yasal metinleri düzenleyebilir.');
  }
}

function htmlFromSettingValue(raw: Prisma.JsonValue | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (typeof o.html === 'string') return o.html;
  }
  return '';
}

function normalizeHtml(html: string): string {
  try {
    return assertRichHtmlLength(html);
  } catch {
    throw new BadRequestException('İçerik çok uzun (en fazla 500.000 karakter)');
  }
}

@Injectable()
export class LegalPagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadBySlug(audience: LegalAudience, slug: string) {
    const meta = getLegalPageDefForAudience(audience, slug);
    if (!meta) throw new NotFoundException('Sayfa bulunamadı');
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: meta.settingKey },
      select: { value: true, updatedAt: true },
    });
    return {
      slug,
      title: meta.title,
      corporateOnly: meta.corporateOnly ?? false,
      html: htmlFromSettingValue(row?.value ?? null),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async listPublic(audience: LegalAudience) {
    return {
      pages: await Promise.all(
        legalPagesForAudience(audience).map((p) => this.loadBySlug(audience, p.slug)),
      ),
    };
  }

  async getPublic(audience: LegalAudience, slugRaw: string) {
    const slug = slugRaw.trim();
    if (!isLegalPageSlugForAudience(audience, slug)) {
      throw new NotFoundException('Sayfa bulunamadı');
    }
    return this.loadBySlug(audience, slug);
  }

  async listStaff(actor: StaffJwtUser, audience: LegalAudience) {
    assertSystemAdmin(actor);
    return this.listPublic(audience);
  }

  async patchStaff(actor: StaffJwtUser, audience: LegalAudience, slugRaw: string, html: string) {
    assertSystemAdmin(actor);
    const slug = slugRaw.trim();
    if (!isLegalPageSlugForAudience(audience, slug)) {
      throw new NotFoundException('Sayfa bulunamadı');
    }
    const meta = getLegalPageDefForAudience(audience, slug)!;
    const normalized = normalizeHtml(html);
    await this.prisma.systemSetting.upsert({
      where: { key: meta.settingKey },
      create: {
        key: meta.settingKey,
        value: { html: normalized } as Prisma.InputJsonValue,
        updatedByUserId: actor.userId,
      },
      update: {
        value: { html: normalized } as Prisma.InputJsonValue,
        updatedByUserId: actor.userId,
      },
    });
    return this.listPublic(audience);
  }
}
