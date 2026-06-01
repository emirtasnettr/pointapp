import { IsString, MaxLength, MinLength } from 'class-validator';

export class CustomerChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Mevcut şifre en az 8 karakter olmalıdır' })
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Yeni şifre en az 8 karakter olmalıdır' })
  @MaxLength(128)
  newPassword!: string;
}
