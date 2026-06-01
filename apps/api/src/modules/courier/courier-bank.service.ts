import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from '../settings/system-config.service';
import { UpdateCourierBankDto } from './dto/update-courier-bank.dto';

@Injectable()
export class CourierBankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  private normalizeIban(raw: string | undefined): string | null {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).replace(/\s/g, '').toUpperCase();
    if (s === '') return null;
    if (!/^TR\d{24}$/.test(s)) {
      throw new BadRequestException('Geçerli bir Türkiye IBAN girin (TR ile başlayan 26 karakter)');
    }
    return s;
  }

  async getBank(userId: string) {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        courierProfile: { select: { iban: true } },
      },
    });
    if (!row?.courierProfile) {
      throw new NotFoundException('Kurye profili bulunamadı');
    }
    const firstName = row.firstName?.trim() ?? '';
    const lastName = row.lastName?.trim() ?? '';
    const accountHolderDisplay = [firstName, lastName].filter(Boolean).join(' ').trim();
    return {
      firstName,
      lastName,
      accountHolderDisplay,
      iban: row.courierProfile.iban ?? '',
    };
  }

  async updateBank(userId: string, dto: UpdateCourierBankDto) {
    const courier = await this.prisma.courierProfile.findUnique({ where: { userId } });
    if (!courier) {
      throw new NotFoundException('Kurye profili bulunamadı');
    }
    if (dto.iban !== undefined) {
      const iban = this.normalizeIban(dto.iban);
      await this.prisma.courierProfile.update({
        where: { userId },
        data: { iban },
      });
    }
    return this.getBank(userId);
  }

  async getSupportLine(): Promise<{ supportLinePhone: string | null }> {
    const supportLinePhone = await this.systemConfig.getSupportLinePhone();
    return { supportLinePhone };
  }
}
