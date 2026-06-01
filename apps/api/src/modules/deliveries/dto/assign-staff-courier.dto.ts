import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssignStaffCourierDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  courierPublicId!: string;
}
