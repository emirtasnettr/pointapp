import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  latestMarketingConsent,
  recordCustomerMarketingConsent,
} from '../auth/customer-consent.util';
import type { UpdateCustomerNotificationSettingsDto } from './dto/update-customer-notification-settings.dto';

@Injectable()
export class CustomerNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  private async profileForUser(userId: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Müşteri profili bulunamadı');
    return profile;
  }

  async getSettings(userId: string) {
    const profile = await this.profileForUser(userId);
    const rows = await this.prisma.customerConsent.findMany({
      where: { customerProfileId: profile.id, type: 'MARKETING_ELECTRONIC' },
      orderBy: { recordedAt: 'desc' },
      select: { type: true, granted: true, recordedAt: true, source: true },
    });
    const marketing = latestMarketingConsent(rows);
    return {
      enabled: marketing?.granted ?? false,
      updatedAt: marketing?.recordedAt ?? null,
      source: marketing?.source ?? null,
    };
  }

  async updateSettings(userId: string, dto: UpdateCustomerNotificationSettingsDto) {
    const profile = await this.profileForUser(userId);

    await this.prisma.$transaction(async (tx) => {
      await recordCustomerMarketingConsent(tx, profile.id, dto.enabled, 'mobile_settings');

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
