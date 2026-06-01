import { IsIn } from 'class-validator';

export class SetCourierUserStatusDto {
  /** Yalnızca operasyonel aktif/pasif. */
  @IsIn(['ACTIVE', 'PASSIVE'])
  status!: 'ACTIVE' | 'PASSIVE';
}
