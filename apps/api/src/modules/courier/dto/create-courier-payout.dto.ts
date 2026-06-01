import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCourierPayoutDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(',', '.') : String(value ?? '').trim(),
  )
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Geçerli bir tutar girin (örn. 150 veya 150,50)',
  })
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
