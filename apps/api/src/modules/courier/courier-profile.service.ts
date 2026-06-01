import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { latestCourierConsentsByType } from '../auth/courier-consent.util';
import { formatTurkishPlateDisplay } from '../../common/turkish-plate';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CourierProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const row = await this.prisma.courierProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            phone: true,
            email: true,
            firstName: true,
            lastName: true,
            tcKimlikNo: true,
            birthDate: true,
            status: true,
            phoneVerifiedAt: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        wallet: { select: { balance: true, pending: true, currency: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Kurye profili bulunamadı');
    }

    const [deliveredCount, consentRows] = await Promise.all([
      this.prisma.delivery.count({
        where: { courierId: row.id, status: DeliveryStatus.DELIVERED },
      }),
      this.prisma.courierConsent.findMany({
        where: { courierProfileId: row.id },
        orderBy: { recordedAt: 'desc' },
        select: { type: true, granted: true, recordedAt: true, source: true },
      }),
    ]);

    const consents = latestCourierConsentsByType(consentRows);
    const firstName = row.user.firstName?.trim() ?? '';
    const lastName = row.user.lastName?.trim() ?? '';

    return {
      publicId: row.publicId,
      type: row.type,
      vehicleType: row.vehicleType,
      plate: row.plate ? formatTurkishPlateDisplay(row.plate) : '',
      merchantCompanyType: row.merchantCompanyType,
      taxNumber: row.taxNumber ?? '',
      iban: row.iban ?? '',
      accountHolderDisplay: [firstName, lastName].filter(Boolean).join(' ').trim(),
      user: {
        phone: row.user.phone,
        email: row.user.email,
        firstName,
        lastName,
        tcKimlikNo: row.user.tcKimlikNo ?? '',
        birthDate: row.user.birthDate
          ? row.user.birthDate.toISOString().slice(0, 10)
          : '',
        status: row.user.status,
        phoneVerifiedAt: row.user.phoneVerifiedAt?.toISOString() ?? null,
        lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
        memberSince: row.user.createdAt.toISOString(),
      },
      wallet: row.wallet
        ? {
            balance: row.wallet.balance.toFixed(2),
            pending: row.wallet.pending.toFixed(2),
            currency: row.wallet.currency,
          }
        : null,
      deliveredCount,
      consents: {
        registrationTerms: consents.registrationTerms,
        marketingNotifications: consents.marketingNotifications,
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
