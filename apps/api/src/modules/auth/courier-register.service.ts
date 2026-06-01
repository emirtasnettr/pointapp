import { randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  CourierMerchantCompanyType,
  CourierOnboardingStatus,
  CourierType,
  Prisma,
  PublicIdPrefix,
  SmsOtpPurpose,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { isValidTCKimlikNo, isValidTurkishVKN } from '../../common/turkish-identifiers';
import { isValidTurkishPlate, normalizeTurkishPlate } from '../../common/turkish-plate';
import {
  assertOtpAttemptsNotExceeded,
  smsSimulationPayload,
} from './sms-otp.util';
import { PrismaService } from '../../prisma/prisma.service';
import { recordCourierConsents } from './courier-consent.util';
import type { CourierRegisterSendSmsDto } from './dto/courier-register-send-sms.dto';
import type { CourierRegisterDto } from './dto/courier-register.dto';

const JWT_TYP = 'courier';

function padPublicSeq(n: number) {
  return String(n).padStart(6, '0');
}

function parseBirthDate(raw: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) {
    throw new BadRequestException('Doğum tarihi geçersiz');
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new BadRequestException('Doğum tarihi geçersiz');
  }
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  if (dt >= todayUtc) {
    throw new BadRequestException('Doğum tarihi bugünden önce olmalıdır');
  }
  const minBirthUtc = new Date(todayUtc);
  minBirthUtc.setUTCFullYear(minBirthUtc.getUTCFullYear() - 18);
  if (dt > minBirthUtc) {
    throw new BadRequestException('Kayıt için en az 18 yaşında olmalısınız');
  }
  return dt;
}

@Injectable()
export class CourierRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

  private validateRegistrationPayload(dto: CourierRegisterDto) {
    const plateRaw = (dto.plate ?? '').trim();
    if (!plateRaw) {
      throw new BadRequestException('Plaka zorunludur');
    }
    if (!isValidTurkishPlate(plateRaw)) {
      throw new BadRequestException('Geçersiz plaka formatı (ör. 34 ABC 123)');
    }
    const plate = normalizeTurkishPlate(plateRaw);

    const tc = dto.tcKimlikNo.replace(/\D/g, '');
    if (!isValidTCKimlikNo(tc)) {
      throw new BadRequestException('T.C. Kimlik numarası geçersiz (kontrol basamakları)');
    }

    const birthDate = parseBirthDate(dto.birthDate);

    if (dto.type === CourierType.INDIVIDUAL) {
      if (dto.merchantCompanyType) {
        throw new BadRequestException('Bireysel kurye kaydında şirket tipi gönderilmemelidir');
      }
      if (dto.taxNumber) {
        throw new BadRequestException('Bireysel kurye kaydında vergi numarası gönderilmemelidir');
      }
      return { tcKimlikNo: tc, birthDate, plate, merchantCompanyType: null, taxNumber: null };
    }

    if (!dto.merchantCompanyType) {
      throw new BadRequestException('Esnaf kurye için şirket tipi seçin');
    }

    if (dto.merchantCompanyType === CourierMerchantCompanyType.SOLE_PROPRIETORSHIP) {
      if (dto.taxNumber) {
        throw new BadRequestException('Şahıs şirketi kaydında vergi numarası gönderilmemelidir');
      }
      return {
        tcKimlikNo: tc,
        birthDate,
        plate,
        merchantCompanyType: dto.merchantCompanyType,
        taxNumber: null,
      };
    }

    const tax = (dto.taxNumber ?? '').replace(/\D/g, '');
    if (tax.length !== 10) {
      throw new BadRequestException('A.Ş. ve Limited için 10 haneli vergi kimlik numarası zorunludur');
    }
    if (!isValidTurkishVKN(tax)) {
      throw new BadRequestException('Vergi kimlik numarası geçersiz (kontrol basamakları)');
    }

    return {
      tcKimlikNo: tc,
      birthDate,
      plate,
      merchantCompanyType: dto.merchantCompanyType,
      taxNumber: tax,
    };
  }

  private async allocateCourierPublicId(
    tx: Prisma.TransactionClient,
    type: CourierType,
  ): Promise<string> {
    const prefix = type === CourierType.MERCHANT ? PublicIdPrefix.EK : PublicIdPrefix.BK;
    const row = await tx.idSequence.findUnique({ where: { prefix } });
    if (!row) {
      await tx.idSequence.create({ data: { prefix, nextValue: 2 } });
      return `${prefix}${padPublicSeq(1)}`;
    }
    const n = row.nextValue;
    await tx.idSequence.update({ where: { prefix }, data: { nextValue: n + 1 } });
    return `${prefix}${padPublicSeq(n)}`;
  }

  async sendSignupSms(dto: CourierRegisterSendSmsDto) {
    const phone = this.normalizeTrMobile(dto.phone);

    const anyUserPhone = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true, courierProfile: { select: { id: true } } },
    });
    if (anyUserPhone) {
      throw new ConflictException(
        anyUserPhone.courierProfile
          ? 'Bu telefon numarası ile zaten kurye kaydı bulunmaktadır'
          : 'Bu telefon numarası sistemde başka bir hesap türüyle kayıtlıdır',
      );
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.smsOtp.create({
      data: {
        phone,
        purpose: SmsOtpPurpose.SIGNUP,
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

  async register(dto: CourierRegisterDto) {
    const phone = this.normalizeTrMobile(dto.phone);
    const email = dto.email.trim().toLowerCase();
    const identity = this.validateRegistrationPayload(dto);

    const phoneBusy = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (phoneBusy) {
      throw new ConflictException('Bu telefon numarası ile zaten bir hesap bulunmaktadır');
    }

    const otp = await this.prisma.smsOtp.findFirst({
      where: {
        phone,
        purpose: SmsOtpPurpose.SIGNUP,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException('Önce telefonunuza SMS kodu gönderin veya süre dolmuş olabilir');
    }

    assertOtpAttemptsNotExceeded(otp.attempts);

    const codeOk = await bcrypt.compare(dto.smsCode, otp.codeHash);
    if (!codeOk) {
      await this.prisma.smsOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('SMS kodu hatalı');
    }

    const emailDup = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (emailDup) {
      throw new ConflictException('Bu e-posta adresi zaten kayıtlı');
    }

    const tcDup = await this.prisma.user.findFirst({
      where: { tcKimlikNo: identity.tcKimlikNo },
      select: { id: true },
    });
    if (tcDup) {
      throw new ConflictException('Bu T.C. Kimlik numarası ile kayıtlı bir hesap bulunmaktadır');
    }

    if (identity.taxNumber) {
      const taxDup = await this.prisma.courierProfile.findFirst({
        where: { taxNumber: identity.taxNumber },
        select: { id: true },
      });
      if (taxDup) {
        throw new ConflictException('Bu vergi kimlik numarası ile kayıtlı bir kurye bulunmaktadır');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { accessToken, courierPublicId } = await this.prisma.$transaction(async (tx) => {
      await tx.smsOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      });

      const publicId = await this.allocateCourierPublicId(tx, dto.type);

      const user = await tx.user.create({
        data: {
          phone,
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          tcKimlikNo: identity.tcKimlikNo,
          birthDate: identity.birthDate,
          status: UserStatus.PENDING_APPROVAL,
          phoneVerifiedAt: new Date(),
        },
      });

      const profile = await tx.courierProfile.create({
        data: {
          userId: user.id,
          type: dto.type,
          publicId,
          vehicleType: dto.vehicleType,
          plate: identity.plate,
          merchantCompanyType: identity.merchantCompanyType,
          taxNumber: identity.taxNumber,
          onboardingStatus: CourierOnboardingStatus.DOCUMENTS_REQUIRED,
        },
      });

      await tx.courierWallet.create({
        data: { courierId: profile.id },
      });

      await recordCourierConsents(tx, profile.id, {
        registrationTermsGranted: dto.acceptedTerms,
        marketingOptIn: dto.marketingOptIn ?? false,
        source: 'mobile_signup',
      });

      const token = await this.jwt.signAsync({
        sub: user.id,
        typ: JWT_TYP,
      });

      return { accessToken: token, courierPublicId: publicId };
    });

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresInSeconds: 60 * 60 * 24 * 7,
      user: {
        email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        courierPublicId,
      },
    };
  }
}
