import { IsOptional, IsString } from 'class-validator';

/** Sadece IBAN güncellenir; ad soyad kullanıcı kaydından salt okunur gelir. */
export class UpdateCourierBankDto {
  @IsOptional()
  @IsString()
  iban?: string;
}
