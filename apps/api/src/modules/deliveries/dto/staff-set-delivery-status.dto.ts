import { DeliveryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class StaffSetDeliveryStatusDto {
  @IsEnum(DeliveryStatus)
  status!: DeliveryStatus;

  /** İptal / düzeltme gibi durumlarda operasyon notu (isteğe bağlı). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
