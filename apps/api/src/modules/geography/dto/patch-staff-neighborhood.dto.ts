import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class PatchStaffNeighborhoodDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  active?: boolean;

  /** TRY ondalıklı (örn. 0, 12.5) */
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'extraFee sayısal olmalı (en fazla 2 ondalık)' })
  extraFee?: string;
}
