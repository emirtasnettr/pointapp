import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export type CourierJwtPayload = { sub: string; typ?: string };

export type CourierJwtUser = {
  userId: string;
  courierPublicId: string;
  /** `CourierProfile.id` — `Delivery.courierId` ile eşleşir */
  courierProfileId: string;
};

@Injectable()
export class CourierJwtStrategy extends PassportStrategy(Strategy, 'courier-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'point-dev-jwt-change-me'),
    });
  }

  async validate(payload: CourierJwtPayload): Promise<CourierJwtUser> {
    if (payload.typ !== 'courier') {
      throw new UnauthorizedException();
    }
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: payload.sub },
      select: { id: true, publicId: true },
    });
    if (!courier) {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.sub,
      courierPublicId: courier.publicId,
      courierProfileId: courier.id,
    };
  }
}
