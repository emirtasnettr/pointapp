import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const SUPPORT_LINE_PHONE_KEY = 'system.supportLinePhone';

export const COMPANY_TAX_SETTING_KEYS = [
  'system.companyLegalTitle',
  'system.companyTaxNumber',
  'system.companyTaxOffice',
  'system.companyAddress',
  'system.companyEmail',
  'system.companyPhone',
] as const;

function jsonString(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  return '';
}

export type CompanyTaxInfo = {
  legalTitle: string;
  taxNumber: string;
  taxOffice: string;
  address: string;
  email: string;
  phone: string;
};

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getSupportLinePhone(): Promise<string | null> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: SUPPORT_LINE_PHONE_KEY },
      select: { value: true },
    });
    const s = jsonString(row?.value);
    return s || null;
  }

  async getCompanyTaxInfo(): Promise<CompanyTaxInfo> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [...COMPANY_TAX_SETTING_KEYS] } },
      select: { key: true, value: true },
    });
    const map = new Map(rows.map((r) => [r.key, jsonString(r.value)]));
    return {
      legalTitle: map.get('system.companyLegalTitle') ?? '',
      taxNumber: map.get('system.companyTaxNumber') ?? '',
      taxOffice: map.get('system.companyTaxOffice') ?? '',
      address: map.get('system.companyAddress') ?? '',
      email: map.get('system.companyEmail') ?? '',
      phone: map.get('system.companyPhone') ?? '',
    };
  }
}
