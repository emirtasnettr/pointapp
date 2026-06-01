import { IsString, MaxLength, MinLength } from 'class-validator';

export class TrackDeliveriesByPhoneDto {
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  phone!: string;
}
