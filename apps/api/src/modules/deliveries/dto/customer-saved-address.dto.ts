import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerSavedAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MinLength(1)
  neighborhoodId!: string;

  /** Sokak, cadde, bina / daire */
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  line1!: string;
}

export class UpdateCustomerSavedAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  neighborhoodId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  line1?: string;
}
