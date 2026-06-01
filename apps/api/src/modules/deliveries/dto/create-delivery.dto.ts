import { DeliveryType, PaymentMethod, VehicleType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class AddressSnapshotDto {
  @IsString()
  label!: string;

  @IsString()
  line1!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  lng?: number;

  /** Fiyat matrisi — müşteri oluşturma akışında zorunlu. */
  @IsOptional()
  @IsString()
  neighborhoodId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;
}

/** Müşteri portalı: `customerId` JWT ile belirlenir. */
export class CreateDeliveryBodyDto {
  @IsEnum(DeliveryType)
  type!: DeliveryType;

  /** Paket: zorunlu içerik açıklaması. Evrak: isteğe bağlı not. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((o) => o.type === DeliveryType.PACKAGE)
  @IsString()
  @IsNotEmpty({ message: 'Paket içeriği zorunludur' })
  @MinLength(3, { message: 'Paket içeriği en az 3 karakter olmalıdır' })
  @MaxLength(500, { message: 'Paket içeriği en fazla 500 karakter olabilir' })
  @ValidateIf((o) => o.type !== DeliveryType.PACKAGE)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** İsteğe bağlı sipariş / teslimat notu (kurye görür). */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  /** Paket gönderilerinde zorunlu (kg). Evrakta gönderilmez. */
  @ValidateIf((o) => o.type === DeliveryType.PACKAGE)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(5000)
  weightKg?: number;

  @ValidateNested()
  @Type(() => AddressSnapshotDto)
  pickupAddress!: AddressSnapshotDto;

  @ValidateNested()
  @Type(() => AddressSnapshotDto)
  dropoffAddress!: AddressSnapshotDto;

  @IsString()
  senderName!: string;

  @IsString()
  senderPhone!: string;

  @IsString()
  recipientName!: string;

  @IsString()
  recipientPhone!: string;

  /** Müşteri uygulaması göndermez; sunucu hesaplar. Operasyon paneli isteğe bağlı gönderebilir. */
  @IsOptional()
  @IsString()
  totalPrice?: string;

  @IsOptional()
  @IsString()
  commissionRate?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  /** Kampanya kodu (büyük/küçük harf duyarsız eşleştirilir) */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  campaignCode?: string;
}

export class CreateDeliveryDto extends CreateDeliveryBodyDto {
  @IsString()
  customerId!: string;
}
