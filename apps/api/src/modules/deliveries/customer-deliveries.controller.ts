import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CustomerJwtUser } from '../auth/strategies/customer-jwt.strategy';
import { CreateDeliveryBodyDto } from './dto/create-delivery.dto';
import { DeliveryQuoteBodyDto } from './dto/delivery-quote.dto';
import { CustomerListDeliveriesDto } from './dto/customer-list-deliveries.dto';
import { DeliveryCustomerInvoiceService } from './delivery-customer-invoice.service';
import { DeliveriesService } from './deliveries.service';

@Controller('customer/deliveries')
@UseGuards(AuthGuard('customer-jwt'))
export class CustomerDeliveriesController {
  constructor(
    private readonly deliveries: DeliveriesService,
    private readonly customerInvoices: DeliveryCustomerInvoiceService,
  ) {}

  @Get()
  list(@Req() req: Request & { user: CustomerJwtUser }, @Query() query: CustomerListDeliveriesDto) {
    return this.deliveries.listForCustomerUser(req.user.userId, query);
  }

  @Post('quote')
  quote(@Req() req: Request & { user: CustomerJwtUser }, @Body() body: DeliveryQuoteBodyDto) {
    return this.deliveries.quoteForCustomerUser(req.user.userId, body);
  }

  @Get('customer-invoices/:invoiceId/file')
  streamCustomerInvoice(
    @Req() req: Request & { user: CustomerJwtUser },
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.customerInvoices.streamForCustomerUser(req.user.userId, invoiceId);
  }

  @Get(':ref')
  getOne(@Req() req: Request & { user: CustomerJwtUser }, @Param('ref') ref: string) {
    return this.deliveries.getOneForCustomerUser(req.user.userId, ref);
  }

  @Post()
  create(@Req() req: Request & { user: CustomerJwtUser }, @Body() body: CreateDeliveryBodyDto) {
    return this.deliveries.createForCustomerUser(req.user.userId, body);
  }
}
