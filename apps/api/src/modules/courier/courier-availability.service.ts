import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourierOnboardingStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CourierAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async load(userId: string) {
    const row = await this.prisma.courierProfile.findUnique({
      where: { userId },
      include: { user: { select: { status: true } } },
    });
    if (!row) throw new NotFoundException('Kurye profili bulunamadı');
    return row;
  }

  async get(userId: string) {
    const row = await this.load(userId);
    const canGoOnline =
      row.user.status === UserStatus.ACTIVE &&
      row.onboardingStatus === CourierOnboardingStatus.APPROVED;

    return {
      isOnline: row.isOnline,
      onlineAt: row.onlineAt?.toISOString() ?? null,
      offlineAt: row.offlineAt?.toISOString() ?? null,
      canGoOnline,
    };
  }

  async set(userId: string, online: boolean) {
    const row = await this.load(userId);

    if (online) {
      if (row.user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('Hesabınız aktif değil; çevrimiçi olamazsınız');
      }
      if (row.onboardingStatus !== CourierOnboardingStatus.APPROVED) {
        throw new ForbiddenException(
          'Evrak onayı tamamlanmadan çevrimiçi olamazsınız',
        );
      }
    }

    const now = new Date();
    const updated = await this.prisma.courierProfile.update({
      where: { id: row.id },
      data: online
        ? { isOnline: true, onlineAt: now, offlineAt: null }
        : { isOnline: false, offlineAt: now },
      select: { isOnline: true, onlineAt: true, offlineAt: true },
    });

    return {
      isOnline: updated.isOnline,
      onlineAt: updated.onlineAt?.toISOString() ?? null,
      offlineAt: updated.offlineAt?.toISOString() ?? null,
      canGoOnline: true,
    };
  }

  async assertOnlineForPool(userId: string) {
    const row = await this.load(userId);
    if (!row.isOnline) {
      throw new ForbiddenException('Havuzu görmek için çevrimiçi olmalısınız');
    }
    if (row.onboardingStatus !== CourierOnboardingStatus.APPROVED) {
      throw new ForbiddenException('Onaylı hesap gerekir');
    }
    if (row.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Hesap aktif değil');
    }
  }
}
