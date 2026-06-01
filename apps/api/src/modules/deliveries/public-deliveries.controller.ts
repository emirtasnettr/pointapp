import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentMethod } from '@prisma/client';
import { CreateDeliveryBodyDto } from './dto/create-delivery.dto';
import { TrackDeliveriesByPhoneDto } from './dto/track-deliveries-by-phone.dto';
import { TrackDeliveriesVerifyDto } from './dto/track-deliveries-verify.dto';
import { DeliveriesService } from './deliveries.service';
import { PublicDeliveryTrackService } from './public-delivery-track.service';

/** Üyelik gerektirmeyen gönderi oluşturma (kart ödemesi). */
@Controller('public/deliveries')
export class PublicDeliveriesController {
  constructor(
    private readonly deliveries: DeliveriesService,
    private readonly track: PublicDeliveryTrackService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  create(@Body() body: CreateDeliveryBodyDto) {
    if (body.paymentMethod !== PaymentMethod.CARD) {
      throw new BadRequestException('Misafir gönderide yalnızca kart ile ödeme kullanılabilir');
    }
    return this.deliveries.createForGuest(body);
  }

  @Post('track/request-otp')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  trackRequestOtp(@Body() body: TrackDeliveriesByPhoneDto) {
    return this.track.requestOtp(body.phone);
  }

  @Post('track/verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  trackVerify(@Body() body: TrackDeliveriesVerifyDto) {
    return this.track.verifyAndTrack(body.phone, body.smsCode);
  }
}
