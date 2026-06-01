import { Injectable, NotFoundException } from '@nestjs/common';
import { CourierConsentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  latestCourierMarketingConsent,
  recordCourierMarketingConsent,
} from '../auth/courier-consent.util';
import type { UpdateCourierNotificationSettingsDto } from './dto/update-courier-notification-settings.dto';

@Injectable()
export class CourierNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  private async profileForUser(userId: string) {
    const profile = await this.prisma.courierProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Kurye profili bulunamadı');
    return profile;
  }

  async getSettings(userId: string) {
    const profile = await this.profileForUser(userId);
    const rows = await this.prisma.courierConsent.findMany({
      where: { courierProfileId: profile.id, type: CourierConsentType.MARKETING_NOTIFICATIONS },
      orderBy: { recordedAt: 'desc' },
      select: { type: true, granted: true, recordedAt: true, source: true },
    });
    const marketing = latestCourierMarketingConsent(rows);
    return {
      enabled: marketing?.granted ?? false,
      updatedAt: marketing?.recordedAt ?? null,
      source: marketing?.source ?? null,
    };
  }

  async updateSettings(userId: string, dto: UpdateCourierNotificationSettingsDto) {
    const profile = await this.profileForUser(userId);

    await this.prisma.$transaction(async (tx) => {
      await recordCourierMarketingConsent(tx, profile.id, dto.enabled, 'mobile_settings');

      if (dto.deviceId?.trim()) {
        const deviceId = dto.deviceId.trim();
        const platform = dto.platform?.trim() || null;
        const tokenFromClient = dto.pushToken?.trim() || null;

        const sessionUpdate: {
          platform: string | null;
          lastSeenAt: Date;
          pushToken?: string | null;
        } = {
          platform,
          lastSeenAt: new Date(),
        };

        if (!dto.enabled) {
          sessionUpdate.pushToken = null;
        } else if (tokenFromClient) {
          sessionUpdate.pushToken = tokenFromClient;
        }

        await tx.deviceSession.upsert({
          where: {
            userId_deviceId: { userId, deviceId },
          },
          create: {
            userId,
            deviceId,
            platform,
            pushToken: dto.enabled ? tokenFromClient : null,
            lastSeenAt: new Date(),
          },
          update: sessionUpdate,
        });
      }
    });

    return this.getSettings(userId);
  }
}
