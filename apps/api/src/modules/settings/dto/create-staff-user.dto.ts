import { AppRole } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

const STAFF_ASSIGNABLE_ROLES = [
  AppRole.SYSTEM_ADMIN,
  AppRole.GENERAL_MANAGER,
  AppRole.OPERATIONS_MANAGER,
  AppRole.OPERATIONS_SPECIALIST,
  AppRole.ACCOUNTING_SPECIALIST,
] as const;

export class CreateStaffUserDto {
  @IsEmail()
  @MaxLength(120)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsEnum(STAFF_ASSIGNABLE_ROLES)
  appRole!: (typeof STAFF_ASSIGNABLE_ROLES)[number];
}
