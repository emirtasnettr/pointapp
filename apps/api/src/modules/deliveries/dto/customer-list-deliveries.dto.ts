import { DeliveryStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class CustomerListDeliveriesDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  /** İstanbul takvimi; `toDate` ile birlikte gönderilirse filtre uygulanır. Gönderilmezse son 7 gün (bugün dahil). */
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
