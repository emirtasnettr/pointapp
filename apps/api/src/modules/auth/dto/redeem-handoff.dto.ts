import { IsString, MaxLength, MinLength } from 'class-validator';

export class RedeemHandoffDto {
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  code!: string;
}
