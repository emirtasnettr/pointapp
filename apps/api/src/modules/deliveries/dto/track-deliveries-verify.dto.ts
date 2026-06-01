import { IsString, MaxLength, MinLength } from 'class-validator';

export class TrackDeliveriesVerifyDto {
  @IsString()
  @MinLength(10)
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(12)
  smsCode!: string;
}
