import { PayoutStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListStaffPayoutRequestsDto {
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}
