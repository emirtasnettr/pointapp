import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkAdjustPriceMatrixDto } from './dto/bulk-adjust-price-matrix.dto';
import { RevisePriceMatrixCellDto } from './dto/revise-price-matrix-cell.dto';

function roundDecimal(value: Prisma.Decimal, decimalPlaces: number): Prisma.Decimal {
  const factor = 10 ** decimalPlaces;
  const n = Math.round(value.toNumber() * factor) / factor;
  return new Prisma.Decimal(n);
}

function adjustByPercent(value: Prisma.Decimal, percent: number, decimalPlaces: number): Prisma.Decimal {
  const factor = 1 + percent / 100;
  if (factor <= 0) {
    throw new BadRequestException('İndirim oranı sonuçları sıfır veya altına düşürür');
  }
  return roundDecimal(new Prisma.Decimal(value.toNumber() * factor), decimalPlaces);
}

@Injectable()
export class GeographyMatrixService {
  constructor(private readonly prisma: PrismaService) {}

  /** Yalnızca güncel satırlar (effectiveTo boş) — yeni teklif/teslimat hesapları buna bakmalı. */
  async listActiveMatrix() {
    const rows = await this.prisma.regionPriceMatrix.findMany({
      where: { effectiveTo: null },
      orderBy: [{ fromRegion: { sortOrder: 'asc' } }, { toRegion: { sortOrder: 'asc' } }],
      include: {
        fromRegion: { select: { id: true, code: true, name: true, sortOrder: true } },
        toRegion: { select: { id: true, code: true, name: true, sortOrder: true } },
      },
    });
    return {
      items: rows.map((m) => ({
        id: m.id,
        fromRegion: m.fromRegion,
        toRegion: m.toRegion,
        baseMotor: m.baseMotor.toString(),
        baseCar: m.baseCar.toString(),
        perKgMotor: m.perKgMotor.toString(),
        perKgCar: m.perKgCar.toString(),
        nightMultiplier: m.nightMultiplier.toString(),
        surgeMultiplier: m.surgeMultiplier.toString(),
        effectiveFrom: m.effectiveFrom.toISOString(),
      })),
    };
  }

  /**
   * Aktif satırı kapatır (effectiveTo = şimdi) ve aynı çift için yeni satır açar.
   * Geçmiş teslimatlar kayıtlı totalPrice ile kalır; yeni talepler yeni satırı kullanır.
   */
  async reviseActiveCell(dto: RevisePriceMatrixCellDto) {
    const fromId = dto.fromRegionId.trim();
    const toId = dto.toRegionId.trim();

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.regionPriceMatrix.findFirst({
        where: { fromRegionId: fromId, toRegionId: toId, effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!current) {
        throw new NotFoundException('Bu kaynak/hedef çifti için aktif matris satırı yok');
      }

      const now = new Date();

      await tx.regionPriceMatrix.update({
        where: { id: current.id },
        data: { effectiveTo: now },
      });

      const perKgMotor = dto.perKgMotor ?? current.perKgMotor.toString();
      const perKgCar = dto.perKgCar ?? current.perKgCar.toString();
      const nightMultiplier = dto.nightMultiplier ?? current.nightMultiplier.toString();
      const surgeMultiplier = dto.surgeMultiplier ?? current.surgeMultiplier.toString();

      await tx.regionPriceMatrix.create({
        data: {
          fromRegionId: fromId,
          toRegionId: toId,
          baseMotor: new Prisma.Decimal(dto.baseMotor),
          baseCar: new Prisma.Decimal(dto.baseCar),
          perKgMotor: new Prisma.Decimal(perKgMotor),
          perKgCar: new Prisma.Decimal(perKgCar),
          nightMultiplier: new Prisma.Decimal(nightMultiplier),
          surgeMultiplier: new Prisma.Decimal(surgeMultiplier),
          effectiveFrom: now,
          effectiveTo: null,
        },
      });
    });

    return this.listActiveMatrix();
  }

  /**
   * Tüm aktif matris satırlarına aynı yüzdeyi uygular; her hücre yeni versiyon olarak açılır.
   */
  async bulkAdjustActiveMatrix(dto: BulkAdjustPriceMatrixDto) {
    const percent = dto.percent;
    if (percent === 0) {
      throw new BadRequestException('Yüzde 0 olamaz');
    }

    const actives = await this.prisma.regionPriceMatrix.findMany({
      where: { effectiveTo: null },
    });
    if (!actives.length) {
      throw new NotFoundException('Aktif matris satırı yok');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const current of actives) {
        await tx.regionPriceMatrix.update({
          where: { id: current.id },
          data: { effectiveTo: now },
        });

        await tx.regionPriceMatrix.create({
          data: {
            fromRegionId: current.fromRegionId,
            toRegionId: current.toRegionId,
            baseMotor: adjustByPercent(current.baseMotor, percent, 2),
            baseCar: adjustByPercent(current.baseCar, percent, 2),
            perKgMotor: adjustByPercent(current.perKgMotor, percent, 4),
            perKgCar: adjustByPercent(current.perKgCar, percent, 4),
            nightMultiplier: adjustByPercent(current.nightMultiplier, percent, 4),
            surgeMultiplier: adjustByPercent(current.surgeMultiplier, percent, 4),
            effectiveFrom: now,
            effectiveTo: null,
          },
        });
      }
    });

    return {
      adjustedCount: actives.length,
      percent,
      matrix: await this.listActiveMatrix(),
    };
  }
}
