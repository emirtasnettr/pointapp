import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CourierJwtUser } from '../auth/strategies/courier-jwt.strategy';
import { CreateCourierPayoutDto } from './dto/create-courier-payout.dto';
import { CourierPayoutService, type PayoutInvoiceUpload } from './courier-payout.service';
import { PAYOUT_INVOICE_MAX_BYTES } from './payout-invoice.constants';

type InvoiceMultipartFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

@Controller('courier/me/payout-requests')
@UseGuards(AuthGuard('courier-jwt'))
export class CourierPayoutController {
  constructor(private readonly payouts: CourierPayoutService) {}

  @Get()
  list(@Req() req: Request & { user: CourierJwtUser }) {
    return this.payouts.list(req.user.userId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('invoice', {
      limits: { fileSize: PAYOUT_INVOICE_MAX_BYTES },
    }),
  )
  create(
    @Req() req: Request & { user: CourierJwtUser },
    @Body() body: CreateCourierPayoutDto,
    @UploadedFile() file: InvoiceMultipartFile | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Ödeme talebi için fatura dosyası zorunludur');
    }
    const invoice: PayoutInvoiceUpload = {
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
      originalname: file.originalname,
    };
    return this.payouts.create(req.user.userId, body, invoice);
  }
}
