import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateStaffCampaignDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  /** Boş veya yok: kod olmadan (müşteri kodu ile kullanılamaz). */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsesPerCustomer?: number | null;

  /** İndirim kuralları vb. JSON; gönderilmezse `{}`. */
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
