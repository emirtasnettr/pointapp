import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CustomerType } from '@prisma/client';

export class CustomerRegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s|-/g, '').trim() : value))
  @IsString()
  @MinLength(10)
  phone!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '').trim() : value))
  @IsString()
  @Matches(/^\d{6}$/, { message: 'SMS kodu 6 rakam olmalıdır' })
  smsCode!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  password!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsEnum(CustomerType, { message: 'Geçerli bir müşteri tipi seçin' })
  customerType!: CustomerType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  companyName?: string;

  /** 10 haneli VKN (kurumsal veya şahıs işletmesi vergi no yolu) */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsString()
  @Matches(/^\d{10}$/)
  taxNumber?: string;

  /** 11 haneli T.C. (bireysel veya şahıs işletmesi T.C. yolu) */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsString()
  @Matches(/^\d{11}$/)
  tcKimlikNo?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Vergi dairesi en az 2 karakter olmalıdır' })
  @MaxLength(120)
  taxOffice?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10, { message: 'Fatura adresi en az 10 karakter olmalıdır' })
  @MaxLength(500)
  billingAddress?: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @Equals(true, { message: 'Kayıt için sözleşmeleri kabul etmeniz gerekir' })
  acceptedTerms!: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  marketingOptIn?: boolean;
}
