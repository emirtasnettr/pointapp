import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Pozitif ondalık (örn. 89 veya 89.50) */
const dec2 = /^\d+(\.\d{1,2})?$/;
/** Pozitif ondalık, kg için daha ince */
const dec4 = /^\d+(\.\d{1,4})?$/;
/** Çarpan: 1 veya 1.15 */
const mult = /^\d+(\.\d{1,4})?$/;

export class RevisePriceMatrixCellDto {
  @IsString()
  @MaxLength(40)
  fromRegionId!: string;

  @IsString()
  @MaxLength(40)
  toRegionId!: string;

  @IsString()
  @Matches(dec2, { message: 'Motor baz geçerli bir tutar olmalı' })
  baseMotor!: string;

  @IsString()
  @Matches(dec2, { message: 'Otomobil baz geçerli bir tutar olmalı' })
  baseCar!: string;

  @IsOptional()
  @IsString()
  @Matches(dec4, { message: 'kg (motor) geçerli bir ondalık olmalı' })
  perKgMotor?: string;

  @IsOptional()
  @IsString()
  @Matches(dec4, { message: 'kg (araç) geçerli bir ondalık olmalı' })
  perKgCar?: string;

  @IsOptional()
  @IsString()
  @Matches(mult, { message: 'Gece çarpanı geçerli olmalı' })
  nightMultiplier?: string;

  @IsOptional()
  @IsString()
  @Matches(mult, { message: 'Dalgalanma çarpanı geçerli olmalı' })
  surgeMultiplier?: string;
}
