import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsOptional } from 'class-validator';

export class AcceptCourierConsentsDto {
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @Equals(true, { message: 'Kayıt için sözleşmeleri kabul etmeniz gerekir' })
  acceptedTerms!: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  marketingOptIn?: boolean;
}
