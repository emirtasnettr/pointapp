import { apiGet } from './api';

export type CompanyTaxInfo = {
  legalTitle: string;
  taxNumber: string;
  taxOffice: string;
  address: string;
  email: string;
  phone: string;
};

export const COMPANY_TAX_FIELDS: { key: keyof CompanyTaxInfo; label: string }[] = [
  { key: 'legalTitle', label: 'Firma ünvan bilgisi' },
  { key: 'taxNumber', label: 'Vergi K.No' },
  { key: 'taxOffice', label: 'Vergi dairesi' },
  { key: 'address', label: 'Firma adresi' },
  { key: 'email', label: 'Firma maili' },
  { key: 'phone', label: 'Firma telefon numarası' },
];

export async function fetchCompanyTaxInfo(): Promise<CompanyTaxInfo> {
  return apiGet<CompanyTaxInfo>('/public/courier/company-tax');
}
