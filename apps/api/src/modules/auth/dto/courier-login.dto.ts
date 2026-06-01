import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CourierLoginDto {
  /** Mobil yapıştırma / boşluk hatalarına karşı */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalı' })
  password!: string;
}
