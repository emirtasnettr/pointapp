import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import sizeOf from 'image-size';
import { apiOriginFromConfig, resolvePublicFileUrl } from '../../common/resolve-public-file-url';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMarketingCampaignDto } from './dto/create-marketing-campaign.dto';
import { PatchMarketingCampaignDto } from './dto/patch-marketing-campaign.dto';
import { marketingCampaignPhase } from './marketing-campaign-window.util';
import { isValidMarketingSlug, slugifyMarketingTitle } from './slug.util';

function assertSystemAdmin(u: StaffJwtUser) {
  if (u.appRole !== AppRole.SYSTEM_ADMIN) {
    throw new ForbiddenException('Yalnızca sistem yöneticisi kampanya içeriklerini yönetebilir.');
  }
}

function normalizeHtml(html: string): string {
  const trimmed = html.trim();
  if (trimmed.length > 500_000) {
    throw new BadRequestException('İçerik çok uzun (en fazla 500.000 karakter)');
  }
  if (/<script\b/i.test(trimmed)) {
    throw new BadRequestException('İçerikte script etiketine izin verilmez');
  }
  return trimmed;
}

function parseDateField(raw: string, label: string): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Geçersiz ${label}`);
  }
  return d;
}

const selectPublic = {
  slug: true,
  title: true,
  summary: true,
  partnerLabel: true,
  imageUrl: true,
  startsAt: true,
  endsAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class MarketingCampaignsService {
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
    partnerLabel: string | null;
    imageUrl: string | null;
    startsAt: Date;
    endsAt: Date;
    updatedAt: Date;
  }) {
    const origin = this.publicOrigin();
    return {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      partnerLabel: row.partnerLabel,
      imageUrl: resolvePublicFileUrl(row.imageUrl, origin),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      phase: marketingCampaignPhase(row.startsAt, row.endsAt),
    };
  }

  private toStaffItem(row: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    contentHtml: string;
    partnerLabel: string | null;
    imageUrl: string | null;
    startsAt: Date;
    endsAt: Date;
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
      contentHtml: row.contentHtml,
      partnerLabel: row.partnerLabel,
      imageUrl: resolvePublicFileUrl(row.imageUrl, origin),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      published: row.published,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      phase: marketingCampaignPhase(row.startsAt, row.endsAt),
    };
  }

  async listPublic(query?: { skip?: number; take?: number }) {
    const skip = query?.skip ?? 0;
    const take = Math.min(Math.max(query?.take ?? 12, 1), 100);
    const where = { published: true };
    const [rows, total] = await Promise.all([
      this.prisma.marketingCampaign.findMany({
        where,
        orderBy: [{ sortOrder: 'desc' }, { startsAt: 'desc' }],
        skip,
        take,
        select: selectPublic,
      }),
      this.prisma.marketingCampaign.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicItem(r)),
      total,
      skip,
      take,
    };
  }

  async getPublicBySlug(slugRaw: string) {
    const slug = slugRaw.trim().toLowerCase();
    const row = await this.prisma.marketingCampaign.findFirst({
      where: { slug, published: true },
    });
    if (!row) throw new NotFoundException('Kampanya bulunamadı');
    const origin = this.publicOrigin();
    return {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      contentHtml: row.contentHtml,
      partnerLabel: row.partnerLabel,
      imageUrl: resolvePublicFileUrl(row.imageUrl, origin),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      phase: marketingCampaignPhase(row.startsAt, row.endsAt),
    };
  }

  async listStaff(actor: StaffJwtUser) {
    assertSystemAdmin(actor);
    const rows = await this.prisma.marketingCampaign.findMany({
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
    });
    return { items: rows.map((r) => this.toStaffItem(r)) };
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base;
    let n = 0;
    for (;;) {
      const clash = await this.prisma.marketingCampaign.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!clash) return candidate;
      n += 1;
      candidate = `${base}-${n}`;
      if (candidate.length > 80) {
        candidate = `${base.slice(0, 70)}-${n}`;
      }
    }
  }

  async createStaff(actor: StaffJwtUser, dto: CreateMarketingCampaignDto) {
    assertSystemAdmin(actor);
    const title = dto.title.trim();
    const summary = dto.summary.trim();
    const startsAt = parseDateField(dto.startsAt, 'başlangıç tarihi');
    const endsAt = parseDateField(dto.endsAt, 'bitiş tarihi');
    if (startsAt > endsAt) {
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden sonra olamaz');
    }

    const rawSlug = (dto.slug?.trim().toLowerCase() || slugifyMarketingTitle(title));
    if (!isValidMarketingSlug(rawSlug)) {
      throw new BadRequestException('Geçersiz slug (küçük harf, rakam ve tire)');
    }
    const slug = await this.uniqueSlug(rawSlug);

    const row = await this.prisma.marketingCampaign.create({
      data: {
        slug,
        title,
        summary,
        contentHtml: normalizeHtml(dto.contentHtml),
        partnerLabel: dto.partnerLabel?.trim() || null,
        startsAt,
        endsAt,
        published: dto.published ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.toStaffItem(row);
  }

  async patchStaff(actor: StaffJwtUser, id: string, dto: PatchMarketingCampaignDto) {
    assertSystemAdmin(actor);
    const existing = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kampanya bulunamadı');

    let startsAt = existing.startsAt;
    let endsAt = existing.endsAt;
    if (dto.startsAt != null) startsAt = parseDateField(dto.startsAt, 'başlangıç tarihi');
    if (dto.endsAt != null) endsAt = parseDateField(dto.endsAt, 'bitiş tarihi');
    if (startsAt > endsAt) {
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden sonra olamaz');
    }

    let slug = existing.slug;
    if (dto.slug != null) {
      const rawSlug = dto.slug.trim().toLowerCase();
      if (!isValidMarketingSlug(rawSlug)) {
        throw new BadRequestException('Geçersiz slug (küçük harf, rakam ve tire)');
      }
      slug = rawSlug === existing.slug ? existing.slug : await this.uniqueSlug(rawSlug, id);
    }

    const row = await this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        ...(dto.title != null ? { title: dto.title.trim() } : {}),
        slug,
        ...(dto.summary != null ? { summary: dto.summary.trim() } : {}),
        ...(dto.contentHtml != null ? { contentHtml: normalizeHtml(dto.contentHtml) } : {}),
        ...(dto.partnerLabel !== undefined
          ? { partnerLabel: dto.partnerLabel?.trim() || null }
          : {}),
        startsAt,
        endsAt,
        ...(dto.published != null ? { published: dto.published } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return this.toStaffItem(row);
  }

  async deleteStaff(actor: StaffJwtUser, id: string) {
    assertSystemAdmin(actor);
    const existing = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kampanya bulunamadı');
    await this.deleteStoredImageIfLocal(existing.imageUrl);
    await this.prisma.marketingCampaign.delete({ where: { id } });
    return { ok: true };
  }

  async uploadImageStaff(
    actor: StaffJwtUser,
    id: string,
    file: { buffer: Buffer; mimetype: string; size: number },
    publicOrigin: string,
  ) {
    assertSystemAdmin(actor);
    if (!file?.buffer?.length) throw new BadRequestException('Dosya gerekli');

    const existing = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kampanya bulunamadı');

    const mime = file.mimetype;
    const extByMime: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
    };
    const ext = extByMime[mime];
    if (!ext) throw new BadRequestException('Yalnızca PNG, JPEG veya WebP yükleyebilirsiniz');

    const dims = sizeOf(file.buffer);
    if (!dims.width || !dims.height) {
      throw new BadRequestException('Görsel boyutları okunamadı');
    }

    await this.deleteStoredImageIfLocal(existing.imageUrl);

    const key = `marketing-campaign-${id}-${randomUUID()}${ext}`;
    const stored = await this.storage.putObject(key, file.buffer, { mime, acl: 'public-read' });
    const origin = publicOrigin.replace(/\/$/, '');
    const publicUrl = `${origin}${stored.url}`;

    const row = await this.prisma.marketingCampaign.update({
      where: { id },
      data: { imageUrl: publicUrl },
    });
    return this.toStaffItem(row);
  }

  private async deleteStoredImageIfLocal(imageUrl: string | null) {
    const url = imageUrl?.trim();
    if (!url) return;
    const idx = url.indexOf('/v1/files/local/');
    if (idx < 0) return;
    const key = decodeURIComponent(url.slice(idx + '/v1/files/local/'.length));
    if (!key) return;
    try {
      await this.storage.deleteObject(key);
    } catch {
      /* storage dosyası yoksa devam */
    }
  }
}
