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
import { CourierMerchantCompanyType, CourierType, VehicleType } from '@prisma/client';

export class CourierRegisterDto {
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

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsString()
  @Matches(/^\d{11}$/, { message: 'T.C. Kimlik numarası 11 hane olmalıdır' })
  tcKimlikNo!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Doğum tarihi YYYY-AA-GG formatında olmalıdır' })
  birthDate!: string;

  @IsEnum(CourierType, { message: 'Geçerli bir kurye tipi seçin' })
  type!: CourierType;

  @IsEnum(VehicleType, { message: 'Geçerli bir araç tipi seçin' })
  vehicleType!: VehicleType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5, { message: 'Plaka zorunludur' })
  @MaxLength(20)
  plate!: string;

  @IsOptional()
  @IsEnum(CourierMerchantCompanyType, { message: 'Geçerli bir şirket tipi seçin' })
  merchantCompanyType?: CourierMerchantCompanyType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Vergi kimlik numarası 10 hane olmalıdır' })
  taxNumber?: string;

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
