import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { DeliveryCustomerInvoiceService } from './delivery-customer-invoice.service';
import { DELIVERY_CUSTOMER_INVOICE_MAX_BYTES } from './delivery-customer-invoice.constants';
import { DeliveriesService } from './deliveries.service';
import { AssignStaffCourierDto } from './dto/assign-staff-courier.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { ListDeliveriesDto } from './dto/list-deliveries.dto';
import { StaffSetDeliveryStatusDto } from './dto/staff-set-delivery-status.dto';

type InvoiceMultipartFile = {
  buffer: Buffer;
  mimetype?: string;
  size: number;
  originalname?: string;
};

@Controller('deliveries')
@UseGuards(AuthGuard('staff-jwt'))
export class DeliveriesController {
  constructor(
    private readonly deliveries: DeliveriesService,
    private readonly customerInvoices: DeliveryCustomerInvoiceService,
  ) {}

  /** `:id` rotasından önce — aksi halde "courier-options" id sanılır. */
  @Get('courier-options')
  courierOptions() {
    return this.deliveries.listCouriersForStaffPick();
  }

  /** `:id` rotasından önce — "stats" id sanılmasın. */
  @Get('stats')
  staffStats() {
    return this.deliveries.staffDeliveryStats();
  }

  /** 30 dk+ bekleyen, kuryesi olmayan havuz / beklemede teslimatlar (operasyon acil alanı). */
  @Get('urgent-no-courier')
  urgentNoCourier() {
    return this.deliveries.staffUrgentNoCourierDeliveries();
  }

  @Post('customer-invoices')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: DELIVERY_CUSTOMER_INVOICE_MAX_BYTES } }),
  )
  uploadCustomerInvoice(
    @Req() req: Request & { user: StaffJwtUser },
    @UploadedFile() file: InvoiceMultipartFile | undefined,
    @Body('deliveryIds') deliveryIds?: string,
    @Body('invoiceNumber') invoiceNumber?: string,
    @Body('note') note?: string,
  ) {
    return this.customerInvoices.uploadFromStaff(req.user.userId, file, deliveryIds, {
      invoiceNumber,
      note,
    });
  }

  @Get('customer-invoices/:invoiceId/file')
  streamCustomerInvoice(@Param('invoiceId') invoiceId: string) {
    return this.customerInvoices.streamForStaff(invoiceId);
  }

  @Get()
  list(@Query() query: ListDeliveriesDto) {
    return this.deliveries.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.deliveries.getOne(id);
  }

  @Post()
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  create(@Req() req: Request & { user: StaffJwtUser }, @Body() body: CreateDeliveryDto) {
    return this.deliveries.create(body, {
      allowManualPricing: true,
      staffAppRole: req.user.appRole,
    });
  }

  @Post(':ref/assign-courier')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  assignCourier(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('ref') ref: string,
    @Body() body: AssignStaffCourierDto,
  ) {
    return this.deliveries.staffAssignCourier(req.user.userId, req.user.staffProfileId, ref, body.courierPublicId);
  }

  @Post(':ref/unassign-courier')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  unassignCourier(@Req() req: Request & { user: StaffJwtUser }, @Param('ref') ref: string) {
    return this.deliveries.staffUnassignCourier(req.user.userId, req.user.staffProfileId, ref);
  }

  @Post(':ref/set-status')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  setStatus(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('ref') ref: string,
    @Body() body: StaffSetDeliveryStatusDto,
  ) {
    return this.deliveries.staffSetManualDeliveryStatus(req.user.userId, req.user.appRole, ref, body);
  }
}
