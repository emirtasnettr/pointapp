import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class SetCourierAvailabilityDto {
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  online!: boolean;
}
