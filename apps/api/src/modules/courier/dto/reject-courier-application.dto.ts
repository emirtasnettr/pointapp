import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectCourierApplicationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3, { message: 'Red nedeni en az 3 karakter olmalıdır' })
  @MaxLength(2000)
  reason!: string;
}
