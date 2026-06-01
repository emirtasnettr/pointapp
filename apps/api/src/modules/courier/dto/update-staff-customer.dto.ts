import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStaffCustomerDto {
  @IsOptional()
  @IsBoolean()
  invoiceAccountEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  taxNumber?: string;
}
