import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import sizeOf from 'image-size';
import { assertRichHtmlLength } from '../../common/html-sanitize';
import { apiOriginFromConfig, resolvePublicFileUrl } from '../../common/resolve-public-file-url';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { isValidMarketingSlug, slugifyMarketingTitle } from '../marketing-campaigns/slug.util';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMarketingServiceDto } from './dto/create-marketing-service.dto';
import { PatchMarketingServiceDto } from './dto/patch-marketing-service.dto';

const ICON_SIZE = 200;

function assertSystemAdmin(u: StaffJwtUser) {
  if (u.appRole !== AppRole.SYSTEM_ADMIN) {
    throw new ForbiddenException('Yalnızca sistem yöneticisi hizmet içeriklerini yönetebilir.');
  }
}

function normalizeHtml(html: string): string {
  try {
    return assertRichHtmlLength(html);
  } catch {
    throw new BadRequestException('İçerik çok uzun (en fazla 500.000 karakter)');
  }
}

const selectPublic = {
  slug: true,
  title: true,
  summary: true,
  iconUrl: true,
  updatedAt: true,
} as const;

@Injectable()
export class MarketingServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageAdapter,
    private readonly config: ConfigService,
  ) {}

  private publicOrigin(): string {
    return apiOriginFromConfig(
      this.config.get<string>('PUBLIC_API_ORIGIN'),
      this.config.get<string>('PORT') ?? process.env.PORT,
    );
  }

  private toPublicItem(row: {
    slug: string;
    title: string;
    summary: string;
    iconUrl: string | null;
    updatedAt: Date;
  }) {
    const origin = this.publicOrigin();
    return {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      iconUrl: resolvePublicFileUrl(row.iconUrl, origin),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toStaffItem(row: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    heroTitle: string;
    heroTitleAccent: string | null;
    heroDescription: string;
    contentHtml: string;
    iconUrl: string | null;
    published: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const origin = this.publicOrigin();
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      heroTitle: row.heroTitle,
      heroTitleAccent: row.heroTitleAccent,
      heroDescription: row.heroDescription,
      contentHtml: row.contentHtml,
      iconUrl: resolvePublicFileUrl(row.iconUrl, origin),
      published: row.published,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listPublic() {
    const rows = await this.prisma.marketingService.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'desc' }, { title: 'asc' }],
      select: selectPublic,
    });
    return { items: rows.map((r) => this.toPublicItem(r)) };
  }

  async getPublicBySlug(slugRaw: string) {
    const slug = slugRaw.trim().toLowerCase();
    const row = await this.prisma.marketingService.findFirst({
      where: { slug, published: true },
    });
    if (!row) throw new NotFoundException('Hizmet bulunamadı');
    const origin = this.publicOrigin();
    return {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      heroTitle: row.heroTitle,
      heroTitleAccent: row.heroTitleAccent,
      heroDescription: row.heroDescription,
      contentHtml: row.contentHtml,
      iconUrl: resolvePublicFileUrl(row.iconUrl, origin),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listStaff(actor: StaffJwtUser) {
    assertSystemAdmin(actor);
    const rows = await this.prisma.marketingService.findMany({
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
    });
    return { items: rows.map((r) => this.toStaffItem(r)) };
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base;
    let n = 0;
    for (;;) {
      const clash = await this.prisma.marketingService.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!clash) return candidate;
      n += 1;
      candidate = `${base}-${n}`;
      if (candidate.length > 80) candidate = `${base.slice(0, 70)}-${n}`;
    }
  }

  async createStaff(actor: StaffJwtUser, dto: CreateMarketingServiceDto) {
    assertSystemAdmin(actor);
    const title = dto.title.trim();
    const rawSlug = dto.slug?.trim().toLowerCase() || slugifyMarketingTitle(title);
    if (!isValidMarketingSlug(rawSlug)) {
      throw new BadRequestException('Geçersiz slug (küçük harf, rakam ve tire)');
    }
    const slug = await this.uniqueSlug(rawSlug);

    const row = await this.prisma.marketingService.create({
      data: {
        slug,
        title,
        summary: dto.summary.trim(),
        heroTitle: dto.heroTitle.trim(),
        heroTitleAccent: dto.heroTitleAccent?.trim() || null,
        heroDescription: dto.heroDescription.trim(),
        contentHtml: normalizeHtml(dto.contentHtml),
        published: dto.published ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.toStaffItem(row);
  }

  async patchStaff(actor: StaffJwtUser, id: string, dto: PatchMarketingServiceDto) {
    assertSystemAdmin(actor);
    const existing = await this.prisma.marketingService.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Hizmet bulunamadı');

    let slug = existing.slug;
    if (dto.slug != null) {
      const rawSlug = dto.slug.trim().toLowerCase();
      if (!isValidMarketingSlug(rawSlug)) {
        throw new BadRequestException('Geçersiz slug (küçük harf, rakam ve tire)');
      }
      slug = rawSlug === existing.slug ? existing.slug : await this.uniqueSlug(rawSlug, id);
    }

    const row = await this.prisma.marketingService.update({
      where: { id },
      data: {
        ...(dto.title != null ? { title: dto.title.trim() } : {}),
        slug,
        ...(dto.summary != null ? { summary: dto.summary.trim() } : {}),
        ...(dto.heroTitle != null ? { heroTitle: dto.heroTitle.trim() } : {}),
        ...(dto.heroTitleAccent !== undefined
          ? { heroTitleAccent: dto.heroTitleAccent?.trim() || null }
          : {}),
        ...(dto.heroDescription != null ? { heroDescription: dto.heroDescription.trim() } : {}),
        ...(dto.contentHtml != null ? { contentHtml: normalizeHtml(dto.contentHtml) } : {}),
        ...(dto.published != null ? { published: dto.published } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return this.toStaffItem(row);
  }

  async deleteStaff(actor: StaffJwtUser, id: string) {
    assertSystemAdmin(actor);
    const existing = await this.prisma.marketingService.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Hizmet bulunamadı');
    await this.deleteStoredFileIfLocal(existing.iconUrl);
    await this.prisma.marketingService.delete({ where: { id } });
    return { ok: true };
  }

  async uploadIconStaff(
    actor: StaffJwtUser,
    id: string,
    file: { buffer: Buffer; mimetype: string; size: number },
    publicOrigin: string,
  ) {
    assertSystemAdmin(actor);
    if (!file?.buffer?.length) throw new BadRequestException('Dosya gerekli');

    const existing = await this.prisma.marketingService.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Hizmet bulunamadı');

    const mime = file.mimetype;
    const extByMime: Record<string, string> = {
      'image/png': '.png',
    };
    const ext = extByMime[mime];
    if (!ext) {
      throw new BadRequestException('Hizmet ikonu yalnızca PNG olmalıdır');
    }

    const dims = sizeOf(file.buffer);
    if (!dims.width || !dims.height) {
      throw new BadRequestException('Görsel boyutları okunamadı');
    }
    if (dims.width !== ICON_SIZE || dims.height !== ICON_SIZE) {
      throw new BadRequestException(`İkon tam ${ICON_SIZE}×${ICON_SIZE} piksel olmalıdır`);
    }

    await this.deleteStoredFileIfLocal(existing.iconUrl);

    const key = `marketing-service-${id}-${randomUUID()}${ext}`;
    const stored = await this.storage.putObject(key, file.buffer, { mime, acl: 'public-read' });
    const origin = publicOrigin.replace(/\/$/, '');
    const publicUrl = `${origin}${stored.url}`;

    const row = await this.prisma.marketingService.update({
      where: { id },
      data: { iconUrl: publicUrl },
    });
    return this.toStaffItem(row);
  }

  private async deleteStoredFileIfLocal(url: string | null) {
    const raw = url?.trim();
    if (!raw) return;
    const idx = raw.indexOf('/v1/files/local/');
    if (idx < 0) return;
    const key = decodeURIComponent(raw.slice(idx + '/v1/files/local/'.length));
    if (!key) return;
    try {
      await this.storage.deleteObject(key);
    } catch {
      /* yoksa devam */
    }
  }
}
