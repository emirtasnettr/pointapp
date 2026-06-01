import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { CreateDeliveryBodyDto } from './dto/create-delivery.dto';
import { TrackDeliveriesByPhoneDto } from './dto/track-deliveries-by-phone.dto';
import { DeliveriesService } from './deliveries.service';

/** Üyelik gerektirmeyen gönderi oluşturma (kart ödemesi). */
@Controller('public/deliveries')
export class PublicDeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Post()
  create(@Body() body: CreateDeliveryBodyDto) {
    if (body.paymentMethod !== PaymentMethod.CARD) {
      throw new BadRequestException('Misafir gönderide yalnızca kart ile ödeme kullanılabilir');
    }
    return this.deliveries.createForGuest(body);
  }

  @Post('track-by-phone')
  trackByPhone(@Body() body: TrackDeliveriesByPhoneDto) {
    return this.deliveries.trackByPhoneForPublic(body.phone);
  }
}
