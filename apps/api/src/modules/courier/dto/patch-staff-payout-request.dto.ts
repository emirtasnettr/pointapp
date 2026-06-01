import { IsIn } from 'class-validator';

/** Personel aksiyonu: onay, ödendi, red */
export class PatchStaffPayoutRequestDto {
  @IsIn(['APPROVED', 'PAID', 'REJECTED'])
  status!: 'APPROVED' | 'PAID' | 'REJECTED';
}
