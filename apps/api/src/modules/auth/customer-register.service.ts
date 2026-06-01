import { randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  CustomerType,
  Prisma,
  PublicIdPrefix,
  SmsOtpPurpose,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { isValidTCKimlikNo, isValidTurkishVKN } from '../../common/turkish-identifiers';
import { PrismaService } from '../../prisma/prisma.service';
import { recordCustomerConsents } from './customer-consent.util';
import type { CustomerRegisterSendSmsDto } from './dto/customer-register-send-sms.dto';
import type { CustomerRegisterDto } from './dto/customer-register.dto';

const JWT_TYP = 'customer';

function padPublicSeq(n: number) {
  return String(n).padStart(6, '0');
}

@Injectable()
export class CustomerRegisterService {
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

  private smsSimulationEnabled(): boolean {
    return this.config.get<string>('POINT_SMS_SIMULATION', '1') !== '0';
  }

  private async allocateCustomerPublicId(
    tx: Prisma.TransactionClient,
    type: CustomerType,
  ): Promise<string> {
    const prefix =
      type === CustomerType.CORPORATE ? PublicIdPrefix.KM : PublicIdPrefix.BM;
    const row = await tx.idSequence.findUnique({ where: { prefix } });
    if (!row) {
      await tx.idSequence.create({ data: { prefix, nextValue: 2 } });
      return `${prefix}${padPublicSeq(1)}`;
    }
    const n = row.nextValue;
    await tx.idSequence.update({ where: { prefix }, data: { nextValue: n + 1 } });
    return `${prefix}${padPublicSeq(n)}`;
  }

  private validateRegisterPayload(dto: CustomerRegisterDto) {
    const { customerType, companyName, taxNumber, tcKimlikNo, taxOffice, billingAddress } = dto;
    const taxOfficeTrimmed = taxOffice?.trim() ?? '';
    const billingAddressTrimmed = billingAddress?.trim() ?? '';

    if (customerType === CustomerType.INDIVIDUAL) {
      if (!tcKimlikNo) throw new BadRequestException('Bireysel kayıtta T.C. Kimlik numarası zorunludur');
      if (taxNumber) throw new BadRequestException('Bireysel kayıtta vergi numarası kullanılamaz');
      if (companyName) throw new BadRequestException('Bireysel kayıtta şirket adı kullanılamaz');
      if (taxOfficeTrimmed) throw new BadRequestException('Bireysel kayıtta vergi dairesi kullanılamaz');
      if (billingAddressTrimmed) throw new BadRequestException('Bireysel kayıtta fatura adresi kullanılamaz');
      if (!isValidTCKimlikNo(tcKimlikNo)) {
        throw new BadRequestException('T.C. Kimlik numarası geçersiz (kontrol basamakları)');
      }
    } else if (customerType === CustomerType.CORPORATE) {
      if (!companyName?.trim()) throw new BadRequestException('Kurumsal kayıtta şirket ünvanı zorunludur');
      if (!taxNumber) throw new BadRequestException('Kurumsal kayıtta vergi numarası zorunludur');
      if (!tcKimlikNo) throw new BadRequestException('Kurumsal kayıtta yetkili T.C. Kimlik numarası zorunludur');
      if (!taxOfficeTrimmed) throw new BadRequestException('Kurumsal kayıtta vergi dairesi zorunludur');
      if (!billingAddressTrimmed) throw new BadRequestException('Kurumsal kayıtta fatura adresi zorunludur');
      if (!isValidTurkishVKN(taxNumber)) {
        throw new BadRequestException('Vergi numarası geçersiz (kontrol basamakları)');
      }
      if (!isValidTCKimlikNo(tcKimlikNo)) {
        throw new BadRequestException('T.C. Kimlik numarası geçersiz (kontrol basamakları)');
      }
    } else if (customerType === CustomerType.SOLE_PROPRIETOR) {
      if (!tcKimlikNo) throw new BadRequestException('Şahıs işletmesi kaydında T.C. Kimlik numarası zorunludur');
      if (!taxNumber) throw new BadRequestException('Şahıs işletmesi kaydında vergi numarası zorunludur');
      if (companyName) throw new BadRequestException('Şahıs işletmesi kaydında şirket ünvanı kullanılamaz');
      if (!taxOfficeTrimmed) throw new BadRequestException('Şahıs işletmesi kaydında vergi dairesi zorunludur');
      if (!billingAddressTrimmed) throw new BadRequestException('Şahıs işletmesi kaydında fatura adresi zorunludur');
      if (!isValidTCKimlikNo(tcKimlikNo)) {
        throw new BadRequestException('T.C. Kimlik numarası geçersiz (kontrol basamakları)');
      }
      if (!isValidTurkishVKN(taxNumber)) {
        throw new BadRequestException('Vergi numarası geçersiz (kontrol basamakları)');
      }
    }
  }

  async sendSignupSms(dto: CustomerRegisterSendSmsDto) {
    const phone = this.normalizeTrMobile(dto.phone);

    const anyUserPhone = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true, customerProfile: { select: { id: true } } },
    });
    if (anyUserPhone) {
      throw new ConflictException(
        anyUserPhone.customerProfile
          ? 'Bu telefon numarası ile zaten müşteri kaydı bulunmaktadır'
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

    const sim = this.smsSimulationEnabled();
    return {
      ok: true as const,
      expiresAt: expiresAt.toISOString(),
      phone,
      ...(sim
        ? {
            simulatedOtp: code,
            simulationNotice:
              'SMS simülasyonu etkin: Gerçek ortamda kod telefona gider; şimdilik ekranda gösterilir.',
          }
        : {}),
    };
  }

  async register(dto: CustomerRegisterDto) {
    const phone = this.normalizeTrMobile(dto.phone);
    const email = dto.email.trim().toLowerCase();

    const phoneBusy = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (phoneBusy) {
      throw new ConflictException('Bu telefon numarası ile zaten bir hesap bulunmaktadır');
    }

    this.validateRegisterPayload(dto);

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

    if (dto.tcKimlikNo) {
      const tcDup = await this.prisma.user.findFirst({
        where: { tcKimlikNo: dto.tcKimlikNo },
        select: { id: true },
      });
      if (tcDup) {
        throw new ConflictException('Bu T.C. Kimlik numarası ile kayıtlı bir hesap bulunmaktadır');
      }
    }

    if (dto.taxNumber) {
      const taxDup = await this.prisma.customerProfile.findFirst({
        where: { taxNumber: dto.taxNumber },
        select: { id: true },
      });
      if (taxDup) {
        throw new ConflictException('Bu vergi numarası ile kayıtlı bir müşteri bulunmaktadır');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { accessToken, customerPublicId } = await this.prisma.$transaction(async (tx) => {
      await tx.smsOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      });

      const publicId = await this.allocateCustomerPublicId(tx, dto.customerType);

      const user = await tx.user.create({
        data: {
          phone,
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          status: UserStatus.ACTIVE,
          phoneVerifiedAt: new Date(),
          tcKimlikNo: dto.tcKimlikNo?.trim() || null,
        },
      });

      const profile = await tx.customerProfile.create({
        data: {
          userId: user.id,
          type: dto.customerType,
          publicId,
          companyName: dto.customerType === CustomerType.CORPORATE ? dto.companyName!.trim() : null,
          taxNumber:
            dto.customerType === CustomerType.INDIVIDUAL
              ? null
              : dto.taxNumber?.trim() || null,
          taxOffice:
            dto.customerType === CustomerType.INDIVIDUAL
              ? null
              : dto.taxOffice?.trim() || null,
          billingAddress:
            dto.customerType === CustomerType.INDIVIDUAL
              ? null
              : dto.billingAddress?.trim() || null,
        },
      });

      await recordCustomerConsents(tx, profile.id, {
        registrationTermsGranted: dto.acceptedTerms,
        marketingOptIn: dto.marketingOptIn ?? false,
        source: 'mobile_signup',
      });

      const token = await this.jwt.signAsync({
        sub: user.id,
        typ: JWT_TYP,
      });

      return { accessToken: token, customerPublicId: publicId };
    });

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresInSeconds: 60 * 60 * 24 * 7,
      user: {
        email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        customerPublicId,
      },
    };
  }
}
