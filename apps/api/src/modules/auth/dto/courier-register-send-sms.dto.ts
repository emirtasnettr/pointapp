import { Transform } from 'class-transformer';
import { IsString, Matches, MinLength } from 'class-validator';

export class CourierRegisterSendSmsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s|-/g, '').trim() : value))
  @IsString()
  @MinLength(10, { message: 'Telefon numarası çok kısa' })
  @Matches(/^(\+?90)?(5\d{9}|0?5\d{9})$/, {
    message: 'Geçerli bir Türkiye cep telefonu girin (örn. 5xx xxx xx xx)',
  })
  phone!: string;
}
