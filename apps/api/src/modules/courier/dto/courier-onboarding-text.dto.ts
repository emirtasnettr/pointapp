import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class CourierOnboardingTextDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(4000)
  textValue!: string;
}
