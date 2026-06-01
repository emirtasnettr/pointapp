import { BadRequestException, Injectable } from '@nestjs/common';
import { DeliveryType, Prisma, VehicleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type DeliveryQuoteInput = {
  type: DeliveryType;
  vehicleType: VehicleType;
  weightKg?: number | null;
  pickupNeighborhoodId?: string | null;
  pickupDistrictId?: string | null;
  dropoffNeighborhoodId?: string | null;
  dropoffDistrictId?: string | null;
  at?: Date;
};

/** Müşteri teslimat hizmet bedeli KDV oranı (hariç tutar üzerinden). */
const DELIVERY_VAT_RATE = new Prisma.Decimal('0.20');

export type DeliveryQuoteResult = {
  /** KDV hariç teslimat ücreti. */
  serviceAmount: string;
  vatRate: string;
  vatAmount: string;
  /** KDV dahil tahsil edilecek tutar. */
  totalPrice: string;
  commissionRate: string;
  commissionAmount: string;
  courierEarning: string;
  priceBreakdown: Record<string, unknown>;
};

type AddressGeo = {
  neighborhoodId?: string | null;
  districtId?: string | null;
};

@Injectable()
export class DeliveryPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(input: DeliveryQuoteInput): Promise<DeliveryQuoteResult> {
    const fromRegionId = await this.resolvePricingRegionId(
      input.pickupDistrictId,
      input.pickupNeighborhoodId,
    );
    const toRegionId = await this.resolvePricingRegionId(
      input.dropoffDistrictId,
      input.dropoffNeighborhoodId,
    );

    const matrix = await this.prisma.regionPriceMatrix.findFirst({
      where: { fromRegionId, toRegionId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!matrix) {
      throw new BadRequestException('Bu güzergâh için fiyat tanımlı değil. Operasyon ile iletişime geçin.');
    }

    const isCar = input.vehicleType === VehicleType.CAR;
    const base = isCar ? matrix.baseCar : matrix.baseMotor;
    const perKg = isCar ? matrix.perKgCar : matrix.perKgMotor;

    let subtotal = base;
    if (input.type === DeliveryType.PACKAGE) {
      const w = input.weightKg != null ? Number(input.weightKg) : NaN;
      if (!Number.isFinite(w) || w <= 0) {
        throw new BadRequestException('Paket gönderilerinde geçerli ağırlık (kg) gerekli');
      }
      subtotal = base.add(perKg.mul(w));
    }

    const [pickupExtra, dropoffExtra, nightMul, commissionRate] = await Promise.all([
      this.neighborhoodExtraFee(input.pickupNeighborhoodId),
      this.neighborhoodExtraFee(input.dropoffNeighborhoodId),
      this.resolveNightMultiplier(matrix.nightMultiplier, input.at ?? new Date()),
      this.getCommissionRateDecimal(),
    ]);

    subtotal = subtotal.add(pickupExtra).add(dropoffExtra);
    subtotal = subtotal.mul(nightMul).mul(matrix.surgeMultiplier);

    const serviceAmount = this.roundMoney(subtotal);
    const vatAmount = this.roundMoney(serviceAmount.mul(DELIVERY_VAT_RATE));
    const total = this.roundMoney(serviceAmount.add(vatAmount));
    /** Komisyon ve kurye hakedişi müşteri KDV’sinden bağımsız, hizmet bedeli (KDV hariç) üzerinden. */
    const commissionAmount = this.roundMoney(serviceAmount.mul(commissionRate));
    const courierEarning = this.roundMoney(serviceAmount.sub(commissionAmount));

    return {
      serviceAmount: serviceAmount.toFixed(2),
      vatRate: DELIVERY_VAT_RATE.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      totalPrice: total.toFixed(2),
      commissionRate: commissionRate.toFixed(4),
      commissionAmount: commissionAmount.toFixed(2),
      courierEarning: courierEarning.toFixed(2),
      priceBreakdown: {
        fromRegionId,
        toRegionId,
        vehicleType: input.vehicleType,
        type: input.type,
        weightKg: input.weightKg ?? null,
        base: base.toFixed(2),
        perKg: perKg.toFixed(4),
        pickupNeighborhoodExtra: pickupExtra.toFixed(2),
        dropoffNeighborhoodExtra: dropoffExtra.toFixed(2),
        nightMultiplier: nightMul.toFixed(4),
        surgeMultiplier: matrix.surgeMultiplier.toFixed(4),
        serviceAmount: serviceAmount.toFixed(2),
        vatRate: DELIVERY_VAT_RATE.toFixed(2),
        vatPercent: 20,
        vatAmount: vatAmount.toFixed(2),
      },
    };
  }

  quoteFromAddressSnapshots(
    input: Omit<DeliveryQuoteInput, 'pickupNeighborhoodId' | 'pickupDistrictId' | 'dropoffNeighborhoodId' | 'dropoffDistrictId'> & {
      pickupAddress: unknown;
      dropoffAddress: unknown;
    },
  ): Promise<DeliveryQuoteResult> {
    const pickup = this.readAddressGeo(input.pickupAddress);
    const dropoff = this.readAddressGeo(input.dropoffAddress);
    return this.quote({
      ...input,
      pickupNeighborhoodId: pickup.neighborhoodId,
      pickupDistrictId: pickup.districtId,
      dropoffNeighborhoodId: dropoff.neighborhoodId,
      dropoffDistrictId: dropoff.districtId,
    });
  }

  private readAddressGeo(raw: unknown): AddressGeo {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const o = raw as Record<string, unknown>;
    const neighborhoodId = typeof o.neighborhoodId === 'string' ? o.neighborhoodId : null;
    const districtId = typeof o.districtId === 'string' ? o.districtId : null;
    return { neighborhoodId, districtId };
  }

  private async resolvePricingRegionId(
    districtId?: string | null,
    neighborhoodId?: string | null,
  ): Promise<string> {
    if (neighborhoodId) {
      const n = await this.prisma.neighborhood.findUnique({
        where: { id: neighborhoodId },
        select: { district: { select: { pricingRegionId: true, active: true } } },
      });
      if (!n?.district?.active) {
        throw new BadRequestException('Seçilen mahalle hizmet dışı');
      }
      if (n.district.pricingRegionId) return n.district.pricingRegionId;
    }
    if (districtId) {
      const d = await this.prisma.district.findUnique({
        where: { id: districtId },
        select: { pricingRegionId: true, active: true },
      });
      if (!d?.active) {
        throw new BadRequestException('Seçilen ilçe hizmet dışı');
      }
      if (d.pricingRegionId) return d.pricingRegionId;
    }
    throw new BadRequestException('Fiyat hesabı için ilçe ve mahalle seçimi gerekli');
  }

  private async neighborhoodExtraFee(neighborhoodId?: string | null): Promise<Prisma.Decimal> {
    if (!neighborhoodId) return new Prisma.Decimal(0);
    const n = await this.prisma.neighborhood.findUnique({
      where: { id: neighborhoodId },
      select: { extraFee: true, active: true },
    });
    if (!n?.active) return new Prisma.Decimal(0);
    return n.extraFee;
  }

  private async getCommissionRateDecimal(): Promise<Prisma.Decimal> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: 'system.commissionDefaultPct' },
      select: { value: true },
    });
    let pct = 45;
    const v = row?.value;
    if (typeof v === 'number' && Number.isFinite(v)) pct = v;
    else if (typeof v === 'string' && v.trim()) {
      const n = Number(v.replace(',', '.'));
      if (Number.isFinite(n)) pct = n;
    }
    if (pct < 0 || pct > 100) pct = 45;
    return new Prisma.Decimal(pct).div(100);
  }

  private async resolveNightMultiplier(
    matrixNight: Prisma.Decimal,
    at: Date,
  ): Promise<Prisma.Decimal> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: ['system.nightTariffStart', 'system.nightTariffEnd'] } },
      select: { key: true, value: true },
    });
    const start = this.settingTime(rows.find((r) => r.key === 'system.nightTariffStart')?.value);
    const end = this.settingTime(rows.find((r) => r.key === 'system.nightTariffEnd')?.value);
    if (!start || !end) return new Prisma.Decimal(1);
    if (this.isNightInIstanbul(at, start, end)) return matrixNight;
    return new Prisma.Decimal(1);
  }

  private settingTime(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const t = value.trim();
    return /^\d{2}:\d{2}$/.test(t) ? t : null;
  }

  /** İstanbul yerel saati; gece penceresi gece yarısını aşabilir (örn. 22:00–06:00). */
  private isNightInIstanbul(at: Date, start: string, end: string): boolean {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(at);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    const now = hour * 60 + minute;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (startMin <= endMin) return now >= startMin && now < endMin;
    return now >= startMin || now < endMin;
  }

  private roundMoney(value: Prisma.Decimal): Prisma.Decimal {
    return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }
}
