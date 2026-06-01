import { IsNumber, Max, Min } from 'class-validator';

/** Tüm aktif matris hücrelerine yüzdelik zam (+) veya indirim (-) uygular. */
export class BulkAdjustPriceMatrixDto {
  /** Örn. 10 = %10 zam, -5 = %5 indirim */
  @IsNumber()
  @Min(-90)
  @Max(500)
  percent!: number;
}
