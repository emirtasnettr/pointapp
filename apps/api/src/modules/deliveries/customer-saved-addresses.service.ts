import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ISTANBUL_REGION_CODE } from '../geography/istanbul-region.const';
import type { CreateCustomerSavedAddressDto, UpdateCustomerSavedAddressDto } from './dto/customer-saved-address.dto';

const neighborhoodInclude = {
  select: {
    id: true,
    name: true,
    active: true,
    district: {
      select: {
        id: true,
        name: true,
        active: true,
        region: { select: { id: true, code: true, name: true } },
      },
    },
  },
} as const;

@Injectable()
export class CustomerSavedAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(customerProfileId: string) {
    const items = await this.prisma.customerSavedAddress.findMany({
      where: { customerId: customerProfileId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { neighborhood: neighborhoodInclude },
    });
    return { items: items.map((a) => this.serialize(a)) };
  }

  async getOne(customerProfileId: string, id: string) {
    const row = await this.prisma.customerSavedAddress.findFirst({
      where: { id, customerId: customerProfileId },
      include: { neighborhood: neighborhoodInclude },
    });
    if (!row) {
      throw new NotFoundException('Adres bulunamadı');
    }
    return this.serialize(row);
  }

  async create(customerProfileId: string, dto: CreateCustomerSavedAddressDto) {
    await this.assertNeighborhoodIstanbul(dto.neighborhoodId);
    const max = await this.prisma.customerSavedAddress.aggregate({
      where: { customerId: customerProfileId },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;
    const row = await this.prisma.customerSavedAddress.create({
      data: {
        customerId: customerProfileId,
        title: dto.title.trim(),
        line1: dto.line1.trim(),
        city: 'İstanbul',
        neighborhoodId: dto.neighborhoodId,
        sortOrder,
      },
      include: { neighborhood: neighborhoodInclude },
    });
    return this.serialize(row);
  }

  async update(customerProfileId: string, id: string, dto: UpdateCustomerSavedAddressDto) {
    const existing = await this.prisma.customerSavedAddress.findFirst({
      where: { id, customerId: customerProfileId },
    });
    if (!existing) {
      throw new NotFoundException('Adres bulunamadı');
    }
    if (dto.neighborhoodId !== undefined) {
      await this.assertNeighborhoodIstanbul(dto.neighborhoodId);
    }
    const data: { title?: string; line1?: string; neighborhoodId?: string } = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.line1 !== undefined) data.line1 = dto.line1.trim();
    if (dto.neighborhoodId !== undefined) data.neighborhoodId = dto.neighborhoodId;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Güncellenecek alan yok');
    }
    const row = await this.prisma.customerSavedAddress.update({
      where: { id },
      data,
      include: { neighborhood: neighborhoodInclude },
    });
    return this.serialize(row);
  }

  async remove(customerProfileId: string, id: string) {
    const existing = await this.prisma.customerSavedAddress.findFirst({
      where: { id, customerId: customerProfileId },
    });
    if (!existing) {
      throw new NotFoundException('Adres bulunamadı');
    }
    await this.prisma.customerSavedAddress.delete({ where: { id } });
    return { ok: true };
  }

  private async assertNeighborhoodIstanbul(neighborhoodId: string) {
    const n = await this.prisma.neighborhood.findFirst({
      where: {
        id: neighborhoodId,
        active: true,
        district: {
          active: true,
          region: { code: ISTANBUL_REGION_CODE },
        },
      },
      select: { id: true },
    });
    if (!n) {
      throw new NotFoundException(
        'Mahalle bulunamadı, pasif ilçe/mahalle veya yalnızca İstanbul dışı seçilemez.',
      );
    }
  }

  private serialize(
    a: {
      id: string;
      title: string;
      line1: string;
      city: string;
      lat: number | null;
      lng: number | null;
      sortOrder: number;
      neighborhood: {
        id: string;
        name: string;
        active: boolean;
        district: {
          id: string;
          name: string;
          active: boolean;
          region: { id: string; code: string; name: string };
        };
      } | null;
    },
  ) {
    let serviceAvailable = true;
    let serviceUnavailableReason: string | null = null;
    if (a.neighborhood) {
      if (!a.neighborhood.district.active) {
        serviceAvailable = false;
        serviceUnavailableReason = 'Şu an bu ilçeye hizmet verilememektedir.';
      } else if (!a.neighborhood.active) {
        serviceAvailable = false;
        serviceUnavailableReason = 'Şu an bu mahalleye hizmet verilememektedir.';
      }
    }

    return {
      id: a.id,
      title: a.title,
      line1: a.line1,
      city: a.city,
      lat: a.lat,
      lng: a.lng,
      sortOrder: a.sortOrder,
      neighborhood: a.neighborhood
        ? {
            id: a.neighborhood.id,
            name: a.neighborhood.name,
            district: {
              id: a.neighborhood.district.id,
              name: a.neighborhood.district.name,
              region: a.neighborhood.district.region,
            },
          }
        : null,
      serviceAvailable,
      serviceUnavailableReason,
    };
  }
}
