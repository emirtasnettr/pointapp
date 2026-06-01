import { DeliveryStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class ListDeliveriesDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  /** `true` iken `status` verilmediyse teslim edilenler listeden çıkar (operasyon ana liste). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  excludeDelivered?: boolean;

  @IsOptional()
  @IsString()
  customerPublicId?: string;

  @IsOptional()
  @IsString()
  courierPublicId?: string;

  /** Sipariş no (# isteğe bağlı), müşteri veya kurye adı / publicId (boşlukla çoklu kelime: hepsi eşleşmeli). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  /** İstanbul takvimi YYYY-MM-DD; `toDate` ile birlikte. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 50;
}
