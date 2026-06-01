import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffCampaignDto } from './dto/create-staff-campaign.dto';
import { PatchStaffCampaignDto } from './dto/patch-staff-campaign.dto';

function normalizeCode(code: string | null | undefined): string | null {
  if (code == null) return null;
  const t = String(code).trim().toUpperCase();
  return t.length ? t : null;
}

/** Bitiş tarihi geçmişte mi (uzatma yasak kuralı için) */
export function isCampaignWindowExpired(endsAt: Date | null): boolean {
  return endsAt != null && endsAt.getTime() < Date.now();
}

const campaignDetailSelect = {
  id: true,
  name: true,
  code: true,
  config: true,
  active: true,
  startsAt: true,
  endsAt: true,
  maxUsesPerCustomer: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { deliveries: true } },
} as const;

@Injectable()
export class StaffCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStaffCampaignDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Kampanya adı boş olamaz');

    const nc = normalizeCode(dto.code ?? null);
    if (nc) {
      const clash = await this.prisma.campaign.findUnique({
        where: { code: nc },
        select: { id: true },
      });
      if (clash) throw new ConflictException('Bu kampanya kodu zaten kullanılıyor');
    }

    let startsAt: Date | null = null;
    let endsAt: Date | null = null;
    if (dto.startsAt != null && dto.startsAt !== '') {
      startsAt = new Date(dto.startsAt);
      if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Geçersiz başlangıç tarihi');
    }
    if (dto.endsAt != null && dto.endsAt !== '') {
      endsAt = new Date(dto.endsAt);
      if (Number.isNaN(endsAt.getTime())) throw new BadRequestException('Geçersiz bitiş tarihi');
    }
    if (startsAt && endsAt && startsAt > endsAt) {
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden sonra olamaz');
    }

    const config: Prisma.InputJsonValue =
      dto.config && typeof dto.config === 'object' && !Array.isArray(dto.config)
        ? (dto.config as Prisma.InputJsonValue)
        : {};

    const row = await this.prisma.campaign.create({
      data: {
        name,
        code: nc,
        active: dto.active ?? true,
        startsAt,
        endsAt,
        maxUsesPerCustomer: dto.maxUsesPerCustomer ?? null,
        config,
      },
      select: { id: true },
    });
    return this.getOne(row.id);
  }

  async list() {
    const rows = await this.prisma.campaign.findMany({
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        code: true,
        active: true,
        startsAt: true,
        endsAt: true,
        maxUsesPerCustomer: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { deliveries: true } },
      },
    });
    const ids = rows.map((r) => r.id);
    const pairs =
      ids.length > 0
        ? await this.prisma.delivery.groupBy({
            by: ['campaignId', 'customerId'],
            where: { campaignId: { in: ids } },
          })
        : [];
    const uniqueByCampaign = new Map<string, number>();
    for (const p of pairs) {
      if (!p.campaignId) continue;
      uniqueByCampaign.set(p.campaignId, (uniqueByCampaign.get(p.campaignId) ?? 0) + 1);
    }
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      active: r.active,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      maxUsesPerCustomer: r.maxUsesPerCustomer,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      totalRedemptions: r._count.deliveries,
      uniqueCustomerCount: uniqueByCampaign.get(r.id) ?? 0,
    }));
  }

  async getOne(id: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id },
      select: campaignDetailSelect,
    });
    if (!c) throw new NotFoundException('Kampanya bulunamadı');

    const distinctCustomers = await this.prisma.delivery.groupBy({
      by: ['customerId'],
      where: { campaignId: id },
    });

    const redemptions = await this.prisma.delivery.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            publicId: true,
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });

    return {
      campaign: {
        id: c.id,
        name: c.name,
        code: c.code,
        config: c.config,
        active: c.active,
        startsAt: c.startsAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
        maxUsesPerCustomer: c.maxUsesPerCustomer,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        windowExpired: isCampaignWindowExpired(c.endsAt),
        totalRedemptions: c._count.deliveries,
        uniqueCustomerCount: distinctCustomers.length,
      },
      redemptions: redemptions.map((d) => ({
        deliveryId: d.id,
        orderNumber: d.orderNumber,
        usedAt: d.createdAt.toISOString(),
        customer: {
          id: d.customer.id,
          publicId: d.customer.publicId,
          email: d.customer.user.email,
          phone: d.customer.user.phone,
        },
      })),
    };
  }

  async patch(id: string, dto: PatchStaffCampaignDto) {
    const current = await this.prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        startsAt: true,
        endsAt: true,
        maxUsesPerCustomer: true,
      },
    });
    if (!current) throw new NotFoundException('Kampanya bulunamadı');

    const expired = isCampaignWindowExpired(current.endsAt);
    if (dto.endsAt !== undefined && expired) {
      throw new BadRequestException('Süresi dolmuş kampanyanın bitiş tarihi değiştirilemez');
    }

    let nextStarts = current.startsAt;
    let nextEnds = current.endsAt;
    if (dto.startsAt !== undefined) {
      nextStarts = dto.startsAt === null ? null : new Date(dto.startsAt);
    }
    if (dto.endsAt !== undefined) {
      nextEnds = dto.endsAt === null ? null : new Date(dto.endsAt);
    }
    if (nextStarts && nextEnds && nextStarts > nextEnds) {
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden sonra olamaz');
    }

    const data: Prisma.CampaignUpdateInput = {};

    if (dto.name !== undefined) {
      const n = dto.name.trim();
      if (!n) throw new BadRequestException('Kampanya adı boş olamaz');
      data.name = n;
    }
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.startsAt !== undefined) {
      data.startsAt = dto.startsAt === null ? null : new Date(dto.startsAt);
    }
    if (dto.endsAt !== undefined) {
      data.endsAt = dto.endsAt === null ? null : new Date(dto.endsAt);
    }
    if (dto.maxUsesPerCustomer !== undefined) {
      if (dto.maxUsesPerCustomer !== null) {
        const perCustomer = await this.prisma.delivery.groupBy({
          by: ['customerId'],
          where: { campaignId: id },
          _count: { _all: true },
        });
        const maxUsesByAnyCustomer = perCustomer.reduce((m, g) => Math.max(m, g._count._all), 0);
        if (dto.maxUsesPerCustomer < maxUsesByAnyCustomer) {
          throw new BadRequestException(
            `Müşteri başına limit en az ${maxUsesByAnyCustomer} olmalı (mevcut kullanımlar).`,
          );
        }
      }
      data.maxUsesPerCustomer = dto.maxUsesPerCustomer;
    }
    if (dto.code !== undefined) {
      const nc = normalizeCode(dto.code === null ? null : String(dto.code));
      const cur = normalizeCode(current.code);
      if (nc !== cur) {
        if (nc) {
          const clash = await this.prisma.campaign.findFirst({
            where: { code: nc, id: { not: id } },
            select: { id: true },
          });
          if (clash) throw new ConflictException('Bu kampanya kodu zaten kullanılıyor');
        }
        data.code = nc;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Güncellenecek alan yok');
    }

    await this.prisma.campaign.update({ where: { id }, data });
    return this.getOne(id);
  }
}
