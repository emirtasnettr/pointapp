import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CustomerJwtUser } from '../auth/strategies/customer-jwt.strategy';
import { CustomerListDeliveriesDto } from './dto/customer-list-deliveries.dto';
import { DeliveryCustomerInvoiceService } from './delivery-customer-invoice.service';

@Controller('customer/invoices')
@UseGuards(AuthGuard('customer-jwt'))
export class CustomerInvoicesController {
  constructor(private readonly customerInvoices: DeliveryCustomerInvoiceService) {}

  @Get()
  list(@Req() req: Request & { user: CustomerJwtUser }, @Query() query: CustomerListDeliveriesDto) {
    return this.customerInvoices.listOverviewForCustomerUser(req.user.userId, query);
  }
}
