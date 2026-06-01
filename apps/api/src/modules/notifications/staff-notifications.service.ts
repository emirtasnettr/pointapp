import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerConsentType, NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BroadcastCustomerPushDto } from './dto/broadcast-customer-push.dto';
import { CreateStaffNotificationDto } from './dto/create-staff-notification.dto';
import { ListStaffNotificationsDto } from './dto/list-staff-notifications.dto';
import { ExpoPushService } from './expo-push.service';

function personName(first?: string | null, last?: string | null) {
  return [first, last]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean)
    .join(' ')
    .trim();
}

const userSelect = { email: true, phone: true, firstName: true, lastName: true } as const;

type NotificationRow = Prisma.NotificationGetPayload<{ include: { user: { select: typeof userSelect } } }>;

@Injectable()
export class StaffNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expoPush: ExpoPushService,
  ) {}

  private normalizeTrMobile(raw: string): string {
    const s = raw.replace(/\s|-/g, '').trim();
    if (s.startsWith('+90')) {
      const rest = s.slice(3);
      if (/^5\d{9}$/.test(rest)) return `+90${rest}`;
      throw new BadRequestException('Geçersiz telefon numarası');
    }
    if (s.startsWith('90') && /^905\d{9}$/.test(s)) return `+${s}`;
    if (s.startsWith('0') && /^05\d{9}$/.test(s)) return `+9${s.slice(1)}`;
    if (/^5\d{9}$/.test(s)) return `+90${s}`;
    throw new BadRequestException('Geçersiz telefon numarası');
  }

  private serializeItem(n: NotificationRow) {
    return {
      id: n.id,
      channel: n.channel,
      title: n.title,
      body: n.body,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      user: {
        email: n.user.email,
        phone: n.user.phone,
        displayName: personName(n.user.firstName, n.user.lastName) || n.user.phone,
      },
    };
  }

  private async pushTokensForUser(userId: string): Promise<string[]> {
    const sessions = await this.prisma.deviceSession.findMany({
      where: { userId, pushToken: { not: null } },
      select: { pushToken: true },
    });
    return [...new Set(sessions.map((s) => s.pushToken!).filter(Boolean))];
  }

  private async marketingOptedInCustomerUserIds(): Promise<Set<string>> {
    const profiles = await this.prisma.customerProfile.findMany({
      select: { id: true, userId: true },
    });
    if (profiles.length === 0) return new Set();

    const consents = await this.prisma.customerConsent.findMany({
      where: {
        customerProfileId: { in: profiles.map((p) => p.id) },
        type: CustomerConsentType.MARKETING_ELECTRONIC,
      },
      orderBy: { recordedAt: 'desc' },
      select: { customerProfileId: true, granted: true },
    });

    const latestByProfile = new Map<string, boolean>();
    for (const row of consents) {
      if (!latestByProfile.has(row.customerProfileId)) {
        latestByProfile.set(row.customerProfileId, row.granted);
      }
    }

    const optedProfileIds = new Set(
      [...latestByProfile.entries()].filter(([, granted]) => granted).map(([id]) => id),
    );

    return new Set(
      profiles.filter((p) => optedProfileIds.has(p.id)).map((p) => p.userId),
    );
  }

  async broadcastCustomerPush(dto: BroadcastCustomerPushDto) {
    const title = dto.title.trim();
    const body = dto.body.trim();

    const sessions = await this.prisma.deviceSession.findMany({
      where: {
        pushToken: { not: null },
        user: { customerProfile: { isNot: null } },
      },
      select: { userId: true, pushToken: true },
    });

    let allowedUserIds: Set<string> | null = null;
    if (dto.marketingOptInOnly) {
      allowedUserIds = await this.marketingOptedInCustomerUserIds();
    }

    const seenTokens = new Set<string>();
    const messages: { to: string; title: string; body: string; data: Record<string, string> }[] = [];
    const recipientUserIds = new Set<string>();

    for (const session of sessions) {
      if (!session.pushToken) continue;
      if (allowedUserIds && !allowedUserIds.has(session.userId)) continue;
      if (seenTokens.has(session.pushToken)) continue;
      seenTokens.add(session.pushToken);
      recipientUserIds.add(session.userId);
      messages.push({
        to: session.pushToken,
        title,
        body,
        data: { type: 'broadcast' },
      });
    }

    if (recipientUserIds.size > 0) {
      await this.prisma.notification.createMany({
        data: [...recipientUserIds].map((userId) => ({
          userId,
          channel: NotificationChannel.PUSH,
          title,
          body,
        })),
      });
    }

    const pushResult = await this.expoPush.send(messages);

    return {
      recipients: recipientUserIds.size,
      pushTokens: messages.length,
      push: pushResult,
    };
  }

  async create(dto: CreateStaffNotificationDto) {
    const email = dto.email?.trim() ? dto.email.trim().toLowerCase() : '';
    const phoneRaw = dto.phone?.trim();
    if (!email && !phoneRaw) {
      throw new BadRequestException('Hedef kullanıcı için e-posta veya telefon girin');
    }

    let user: { id: string; email: string | null; phone: string; firstName: string | null; lastName: string | null } | null =
      null;

    if (email) {
      user = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, ...userSelect },
      });
    }
    if (!user && phoneRaw) {
      const phone = this.normalizeTrMobile(phoneRaw);
      user = await this.prisma.user.findFirst({
        where: { phone },
        select: { id: true, ...userSelect },
      });
    }

    if (!user) {
      throw new NotFoundException('Bu e-posta veya telefon ile kullanıcı bulunamadı');
    }

    const row = await this.prisma.notification.create({
      data: {
        userId: user.id,
        channel: dto.channel,
        title: dto.title.trim(),
        body: dto.body.trim(),
        data:
          dto.data === undefined
            ? undefined
            : (dto.data as unknown as Prisma.InputJsonValue),
      },
      include: { user: { select: userSelect } },
    });

    let push: { sent: number; skipped: number; errors: string[] } | null = null;
    if (dto.channel === NotificationChannel.PUSH) {
      const tokens = await this.pushTokensForUser(user.id);
      if (tokens.length > 0) {
        push = await this.expoPush.send(
          tokens.map((to) => ({
            to,
            title: dto.title.trim(),
            body: dto.body.trim(),
            data: { type: 'staff' },
          })),
        );
      } else {
        push = { sent: 0, skipped: 0, errors: ['Kayıtlı push token yok'] };
      }
    }

    return { ...this.serializeItem(row), push };
  }

  async list(dto: ListStaffNotificationsDto) {
    const skip = dto.skip ?? 0;
    const take = dto.take ?? 50;
    const q = dto.q?.trim();

    const where: Prisma.NotificationWhereInput = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: userSelect },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: rows.map((n) => this.serializeItem(n)),
      total,
      skip,
      take,
    };
  }
}
