import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PatchStaffDistrictDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  active?: boolean;

  /** Fiyat matrisi bölgesi (`Region` kaydı, kodu `IST-PZ…` olan) */
  @IsOptional()
  @IsString()
  pricingRegionId?: string;
}
