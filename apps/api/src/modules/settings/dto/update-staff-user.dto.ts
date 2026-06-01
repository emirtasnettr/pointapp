import { AppRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const STAFF_ASSIGNABLE_ROLES = [
  AppRole.SYSTEM_ADMIN,
  AppRole.GENERAL_MANAGER,
  AppRole.OPERATIONS_MANAGER,
  AppRole.OPERATIONS_SPECIALIST,
  AppRole.ACCOUNTING_SPECIALIST,
] as const;

export class UpdateStaffUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(STAFF_ASSIGNABLE_ROLES)
  appRole?: (typeof STAFF_ASSIGNABLE_ROLES)[number];
}
