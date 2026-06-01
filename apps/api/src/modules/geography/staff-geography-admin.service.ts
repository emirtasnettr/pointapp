import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PatchStaffDistrictDto } from './dto/patch-staff-district.dto';

const districtStaffSelect = {
  id: true,
  name: true,
  regionId: true,
  active: true,
  pricingRegionId: true,
  pricingRegion: { select: { id: true, code: true, name: true, sortOrder: true } },
} as const;

@Injectable()
export class StaffGeographyAdminService {
  constructor(private readonly prisma: PrismaService) {}

  listDistricts(regionId: string) {
    return this.prisma.district.findMany({
      where: { regionId },
      orderBy: { name: 'asc' },
      select: districtStaffSelect,
    });
  }

  /** Matris satır/sütunları: `IST-PZ…` kodlu bölgeler */
  listPricingZones() {
    return this.prisma.region.findMany({
      where: { code: { startsWith: 'IST-PZ' } },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true, name: true, sortOrder: true },
    });
  }

  async listNeighborhoods(districtId: string) {
    const rows = await this.prisma.neighborhood.findMany({
      where: { districtId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        districtId: true,
        extraFee: true,
        active: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      districtId: r.districtId,
      active: r.active,
      extraFee: r.extraFee.toFixed(2),
    }));
  }

  private async assertIstPzRegion(regionId: string) {
    const r = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { code: true },
    });
    if (!r || !r.code.startsWith('IST-PZ')) {
      throw new BadRequestException('Geçersiz fiyat bölgesi — yalnızca IST-PZ… kodlu bölgeler seçilebilir.');
    }
  }

  async patchDistrict(id: string, body: PatchStaffDistrictDto) {
    const row = await this.prisma.district.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('İlçe bulunamadı');

    const data: Prisma.DistrictUpdateInput = {};
    if (body.active !== undefined) data.active = body.active;
    if (body.pricingRegionId !== undefined) {
      const pid = body.pricingRegionId.trim();
      if (!pid) throw new BadRequestException('pricingRegionId boş olamaz');
      await this.assertIstPzRegion(pid);
      data.pricingRegion = { connect: { id: pid } };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Güncellenecek alan yok');
    }

    return this.prisma.district.update({
      where: { id },
      data,
      select: districtStaffSelect,
    });
  }

  async patchNeighborhood(id: string, body: { active?: boolean; extraFee?: string }) {
    const row = await this.prisma.neighborhood.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Mahalle bulunamadı');
    const data: Prisma.NeighborhoodUpdateInput = {};
    if (body.active !== undefined) data.active = body.active;
    if (body.extraFee !== undefined) {
      data.extraFee = new Prisma.Decimal(body.extraFee.trim());
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Güncellenecek alan yok');
    }
    const updated = await this.prisma.neighborhood.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        districtId: true,
        extraFee: true,
        active: true,
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      districtId: updated.districtId,
      active: updated.active,
      extraFee: updated.extraFee.toFixed(2),
    };
  }
}
