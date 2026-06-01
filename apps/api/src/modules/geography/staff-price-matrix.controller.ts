import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BulkAdjustPriceMatrixDto } from './dto/bulk-adjust-price-matrix.dto';
import { RevisePriceMatrixCellDto } from './dto/revise-price-matrix-cell.dto';
import { PatchStaffDistrictDto } from './dto/patch-staff-district.dto';
import { PatchStaffNeighborhoodDto } from './dto/patch-staff-neighborhood.dto';
import { GeographyMatrixService } from './geography-matrix.service';
import { StaffGeographyAdminService } from './staff-geography-admin.service';

/** Staff coğrafya: fiyat matrisi + ilçe/mahalle (pasif, ek ücret). */
@Controller('staff/geography')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffPriceMatrixController {
  constructor(
    private readonly geographyMatrix: GeographyMatrixService,
    private readonly geoAdmin: StaffGeographyAdminService,
  ) {}

  @Get('districts')
  staffDistricts(@Query('regionId') regionId?: string) {
    const rid = regionId?.trim();
    if (!rid) throw new BadRequestException('regionId gerekli');
    return this.geoAdmin.listDistricts(rid);
  }

  /** Fiyat matrisi eksenindeki bölgeler (IST-PZ01… — ilçe ataması için) */
  @Get('pricing-zones')
  staffPricingZones() {
    return this.geoAdmin.listPricingZones();
  }

  @Get('neighborhoods')
  staffNeighborhoods(@Query('districtId') districtId?: string) {
    const did = districtId?.trim();
    if (!did) throw new BadRequestException('districtId gerekli');
    return this.geoAdmin.listNeighborhoods(did);
  }

  @Patch('districts/:id')
  patchDistrict(@Param('id') id: string, @Body() body: PatchStaffDistrictDto) {
    return this.geoAdmin.patchDistrict(id.trim(), body);
  }

  @Patch('neighborhoods/:id')
  patchNeighborhood(@Param('id') id: string, @Body() body: PatchStaffNeighborhoodDto) {
    return this.geoAdmin.patchNeighborhood(id.trim(), body);
  }

  /** Aktif matris hücresini yeni versiyonla değiştirir; önceki satır kapanır (geçmiş korunur). */
  @Patch('price-matrix')
  revise(@Body() body: RevisePriceMatrixCellDto) {
    return this.geographyMatrix.reviseActiveCell(body);
  }

  /** Tüm aktif hücrelere toplu yüzdelik zam (+) veya indirim (-). */
  @Patch('price-matrix/bulk-percent')
  bulkPercent(@Body() body: BulkAdjustPriceMatrixDto) {
    return this.geographyMatrix.bulkAdjustActiveMatrix(body);
  }
}
