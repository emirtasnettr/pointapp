import { DeliveryType, VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

/** Tanıtım sitesi fiyat önizlemesi — ilçe veya tam adres. */
export class PublicDeliveryQuoteDto {
  @IsString()
  pickupDistrictId!: string;

  @IsString()
  dropoffDistrictId!: string;

  @IsOptional()
  @IsString()
  pickupNeighborhoodId?: string;

  @IsOptional()
  @IsString()
  dropoffNeighborhoodId?: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  type?: DeliveryType;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ValidateIf((o) => o.type === DeliveryType.PACKAGE)
  @Type(() => Number)
  @Min(0.01)
  @Max(5000)
  weightKg?: number;
}
