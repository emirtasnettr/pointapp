import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  latestCourierConsentsByType,
  recordCourierConsents,
} from '../auth/courier-consent.util';
import type { AcceptCourierConsentsDto } from './dto/accept-courier-consents.dto';

@Injectable()
export class CourierConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async profileForUser(userId: string) {
    const profile = await this.prisma.courierProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Kurye profili bulunamadı');
    return profile;
  }

  async getStatus(userId: string) {
    const profile = await this.profileForUser(userId);
    const rows = await this.prisma.courierConsent.findMany({
      where: { courierProfileId: profile.id },
      orderBy: { recordedAt: 'desc' },
      select: { type: true, granted: true, recordedAt: true, source: true },
    });
    return latestCourierConsentsByType(rows);
  }

  async accept(userId: string, dto: AcceptCourierConsentsDto) {
    if (!dto.acceptedTerms) {
      throw new BadRequestException('Sözleşmeleri kabul etmeniz gerekir');
    }
    const profile = await this.profileForUser(userId);
    const existing = await this.getStatus(userId);
    if (!existing.needsTermsAcceptance) {
      return existing;
    }
    await this.prisma.$transaction(async (tx) => {
      await recordCourierConsents(tx, profile.id, {
        registrationTermsGranted: true,
        marketingOptIn: dto.marketingOptIn ?? false,
        source: 'mobile_onboarding',
      });
    });
    return this.getStatus(userId);
  }
}
