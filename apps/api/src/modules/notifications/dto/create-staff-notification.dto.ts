import { NotificationChannel } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStaffNotificationDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s|-/g, '').trim() : value))
  @IsString()
  phone?: string;

  @IsEnum(NotificationChannel, { message: 'Geçerli bir kanal seçin (PUSH, SMS, IN_APP)' })
  channel!: NotificationChannel;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
