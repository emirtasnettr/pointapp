import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '@prisma/client';
import { getJwtSecret } from '../../../config/jwt-secret';
import { PrismaService } from '../../../prisma/prisma.service';

export type CustomerJwtPayload = { sub: string; typ?: string };

export type CustomerJwtUser = {
  userId: string;
  customerPublicId: string;
  /** `CustomerProfile.id` — `Delivery.customerId` ile eşleşir */
  customerProfileId: string;
};

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
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

  async validate(payload: CustomerJwtPayload): Promise<CustomerJwtUser> {
    if (payload.typ !== 'customer') {
      throw new UnauthorizedException();
    }
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId: payload.sub },
      select: {
        id: true,
        publicId: true,
        user: { select: { status: true } },
      },
    });
    if (!customer) {
      throw new UnauthorizedException();
    }
    if (customer.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Hesap aktif değil');
    }
    return {
      userId: payload.sub,
      customerPublicId: customer.publicId,
      customerProfileId: customer.id,
    };
  }
}
