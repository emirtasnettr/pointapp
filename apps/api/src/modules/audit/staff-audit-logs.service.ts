import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListStaffAuditLogsDto } from './dto/list-staff-audit-logs.dto';

const actorSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
} as const;

function utcDayStart(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 0, 0, 0, 0));
}

function utcDayEnd(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d, 23, 59, 59, 999));
}

function parseYmd(s: string | undefined): { y: number; m: number; d: number } | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo - 1, d };
}

function actorDisplayName(a: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string;
}): string {
  const n = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim();
  if (n) return n;
  if (a.email) return a.email;
  return a.phone;
}

@Injectable()
export class StaffAuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: ListStaffAuditLogsDto) {
    if (dto.from?.trim() && !parseYmd(dto.from)) {
      throw new BadRequestException('Geçersiz başlangıç (YYYY-MM-DD)');
    }
    if (dto.to?.trim() && !parseYmd(dto.to)) {
      throw new BadRequestException('Geçersiz bitiş (YYYY-MM-DD)');
    }

    const fromParts = parseYmd(dto.from);
    const toParts = parseYmd(dto.to);
    if (fromParts && toParts) {
      if (utcDayStart(fromParts.y, fromParts.m, fromParts.d).getTime() > utcDayEnd(toParts.y, toParts.m, toParts.d).getTime()) {
        throw new BadRequestException('Başlangıç bitişten sonra olamaz');
      }
    }

    const where = this.buildWhere(dto);
    const skip = dto.skip ?? 0;
    const take = Math.min(dto.take ?? 50, 100);

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actor: { select: actorSelect } },
      }),
    ]);

    return {
      total,
      skip,
      take,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        resource: r.resource,
        resourceId: r.resourceId,
        ip: r.ip,
        userAgent: r.userAgent,
        diff: r.diff,
        createdAt: r.createdAt.toISOString(),
        actor: r.actor
          ? {
              id: r.actor.id,
              email: r.actor.email,
              phone: r.actor.phone,
              displayName: actorDisplayName(r.actor),
            }
          : null,
      })),
    };
  }

  private buildWhere(dto: ListStaffAuditLogsDto): Prisma.AuditLogWhereInput {
    const and: Prisma.AuditLogWhereInput[] = [];

    if (dto.q?.trim()) {
      const t = dto.q.trim();
      and.push({
        OR: [
          { action: { contains: t, mode: 'insensitive' } },
          { resource: { contains: t, mode: 'insensitive' } },
          { resourceId: { contains: t, mode: 'insensitive' } },
        ],
      });
    }

    if (dto.resource?.trim()) {
      and.push({ resource: { equals: dto.resource.trim(), mode: 'insensitive' } });
    }

    const fromParts = parseYmd(dto.from);
    const toParts = parseYmd(dto.to);
    if (fromParts && toParts) {
      and.push({
        createdAt: {
          gte: utcDayStart(fromParts.y, fromParts.m, fromParts.d),
          lte: utcDayEnd(toParts.y, toParts.m, toParts.d),
        },
      });
    } else if (fromParts) {
      and.push({ createdAt: { gte: utcDayStart(fromParts.y, fromParts.m, fromParts.d) } });
    } else if (toParts) {
      and.push({ createdAt: { lte: utcDayEnd(toParts.y, toParts.m, toParts.d) } });
    }

    return and.length ? { AND: and } : {};
  }
}
