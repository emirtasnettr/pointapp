import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '@prisma/client';
import { getJwtSecret } from '../../../config/jwt-secret';
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
      secretOrKey: getJwtSecret(config),
    });
  }

  async validate(payload: CourierJwtPayload): Promise<CourierJwtUser> {
    if (payload.typ !== 'courier') {
      throw new UnauthorizedException();
    }
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: payload.sub },
      select: {
        id: true,
        publicId: true,
        user: { select: { status: true } },
      },
    });
    if (!courier) {
      throw new UnauthorizedException();
    }
    if (courier.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Hesap aktif değil');
    }
    return {
      userId: payload.sub,
      courierPublicId: courier.publicId,
      courierProfileId: courier.id,
    };
  }
}
