import { DeliveryType, VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class DeliveryQuoteBodyDto {
  @IsEnum(DeliveryType)
  type!: DeliveryType;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ValidateIf((o) => o.type === DeliveryType.PACKAGE)
  @Type(() => Number)
  @Min(0.01)
  @Max(5000)
  weightKg?: number;

  @IsOptional()
  @IsString()
  pickupSavedAddressId?: string;

  @IsOptional()
  @IsString()
  pickupDistrictId?: string;

  @IsOptional()
  @IsString()
  pickupNeighborhoodId?: string;

  @IsOptional()
  @IsString()
  dropoffSavedAddressId?: string;

  @IsOptional()
  @IsString()
  dropoffDistrictId?: string;

  @IsOptional()
  @IsString()
  dropoffNeighborhoodId?: string;
}
