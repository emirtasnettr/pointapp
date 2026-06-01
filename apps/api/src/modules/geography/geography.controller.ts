import { Body, Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { DeliveryType, VehicleType } from '@prisma/client';
import { DeliveryPricingService } from '../deliveries/delivery-pricing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GeographyMatrixService } from './geography-matrix.service';
import { StaffGeographyAdminService } from './staff-geography-admin.service';
import { PublicDeliveryQuoteDto } from './dto/public-delivery-quote.dto';
import { ISTANBUL_REGION_CODE } from './istanbul-region.const';

/** İstanbul ilçe / mahalle listeleri (kimlik doğrulaması gerekmez) */
@Controller('geography')
export class GeographyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geographyMatrix: GeographyMatrixService,
    private readonly geoAdmin: StaffGeographyAdminService,
    private readonly pricing: DeliveryPricingService,
  ) {}

  @Get('regions')
  async regions() {
    const rows = await this.prisma.region.findMany({
      where: { code: ISTANBUL_REGION_CODE },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        sortOrder: true,
        geographyDistricts: {
          where: { active: true },
          select: {
            _count: {
              select: {
                neighborhoods: { where: { active: true } },
              },
            },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      sortOrder: r.sortOrder,
      districtCount: r.geographyDistricts.length,
      neighborhoodCount: r.geographyDistricts.reduce((sum, d) => sum + d._count.neighborhoods, 0),
    }));
  }

  /** Aktif (effectiveTo boş) bölgeden bölgeye fiyat satırları — admin önizleme */
  @Get('price-matrix')
  priceMatrix() {
    return this.geographyMatrix.listActiveMatrix();
  }

  /** Fiyat matrisi PZ bölgeleri (IST-PZ…) — ilçe ataması için; kimlik gerekmez (salt okunur meta). */
  @Get('pricing-zones')
  pricingZones() {
    return this.geoAdmin.listPricingZones();
  }

  @Get('districts')
  async districts(@Query('regionId') regionId?: string) {
    let rid = regionId?.trim();
    if (!rid) {
      const r = await this.prisma.region.findUnique({
        where: { code: ISTANBUL_REGION_CODE },
        select: { id: true },
      });
      if (!r) return [];
      rid = r.id;
    }
    return this.prisma.district.findMany({
      where: { regionId: rid, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, regionId: true },
    });
  }

  /** Kimlik gerekmez — tanıtım sitesi ve form önizlemesi (evrak + motosiklet varsayılan). */
  @Post('quote')
  quote(@Body() body: PublicDeliveryQuoteDto) {
    let vehicleType = body.vehicleType ?? VehicleType.MOTORCYCLE;
    const type = body.type ?? DeliveryType.DOCUMENT;
    if (
      type === DeliveryType.PACKAGE &&
      body.weightKg != null &&
      body.weightKg > 20
    ) {
      vehicleType = VehicleType.CAR;
    }
    return this.pricing.quote({
      type,
      vehicleType,
      weightKg: body.weightKg,
      pickupDistrictId: body.pickupDistrictId.trim(),
      pickupNeighborhoodId: body.pickupNeighborhoodId?.trim() || null,
      dropoffDistrictId: body.dropoffDistrictId.trim(),
      dropoffNeighborhoodId: body.dropoffNeighborhoodId?.trim() || null,
    });
  }

  @Get('neighborhoods')
  async neighborhoods(@Query('districtId') districtId?: string) {
    const did = districtId?.trim();
    if (!did) {
      throw new BadRequestException('districtId gerekli');
    }
    const rows = await this.prisma.neighborhood.findMany({
      where: {
        districtId: did,
        active: true,
        district: { active: true },
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, districtId: true, extraFee: true },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      districtId: r.districtId,
      extraFee: r.extraFee.toFixed(2),
    }));
  }
}
