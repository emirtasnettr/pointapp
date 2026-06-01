import { IsOptional, Matches } from 'class-validator';

/** `YYYY-MM-DD` (UTC günü). Boşsa son 14 gün (bugün dahil). */
export class ListStaffReportsDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
