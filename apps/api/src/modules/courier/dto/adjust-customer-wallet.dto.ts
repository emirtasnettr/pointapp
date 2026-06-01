import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Örn. `150`, `-50.25` (virgül kullanılmaz). */
export class AdjustCustomerWalletDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/^-?\d+(\.\d{1,2})?$/, { message: 'Tutar geçerli bir ondalık sayı olmalı (örn. 100 veya -25.50)' })
  amount!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
