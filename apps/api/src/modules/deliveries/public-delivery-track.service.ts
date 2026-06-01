import { randomInt } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsOtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  assertOtpAttemptsNotExceeded,
  smsSimulationPayload,
} from '../auth/sms-otp.util';
import { trPhoneLookupVariants } from '../../common/tr-phone.util';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveriesService } from './deliveries.service';

@Injectable()
export class PublicDeliveryTrackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly deliveries: DeliveriesService,
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

  async requestOtp(phoneRaw: string) {
    const phone = this.normalizeTrMobile(phoneRaw);
    const variants = trPhoneLookupVariants(phone);
    const hasDelivery = await this.prisma.delivery.findFirst({
      where: {
        OR: variants.flatMap((v) => [{ senderPhone: v }, { recipientPhone: v }]),
      },
      select: { id: true },
    });
    if (!hasDelivery) {
      throw new BadRequestException('Bu numara ile kayıtlı gönderi bulunamadı');
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.smsOtp.create({
      data: {
        phone,
        purpose: SmsOtpPurpose.TRACK_DELIVERY,
        codeHash,
        expiresAt,
      },
    });

    return {
      ok: true as const,
      expiresAt: expiresAt.toISOString(),
      phone,
      ...smsSimulationPayload(this.config, code),
    };
  }

  async verifyAndTrack(phoneRaw: string, smsCodeRaw: string) {
    const phone = this.normalizeTrMobile(phoneRaw);
    const smsCode = smsCodeRaw.trim();

    const otp = await this.prisma.smsOtp.findFirst({
      where: {
        phone,
        purpose: SmsOtpPurpose.TRACK_DELIVERY,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException('Önce SMS kodu isteyin veya süre dolmuş olabilir');
    }

    assertOtpAttemptsNotExceeded(otp.attempts);

    const codeOk = await bcrypt.compare(smsCode, otp.codeHash);
    if (!codeOk) {
      await this.prisma.smsOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('SMS kodu hatalı');
    }

    await this.prisma.smsOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    return this.deliveries.trackByPhoneForPublic(phone);
  }
}
