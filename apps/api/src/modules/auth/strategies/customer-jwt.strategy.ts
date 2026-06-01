import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
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
      secretOrKey: config.get<string>('JWT_SECRET', 'point-dev-jwt-change-me'),
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<CustomerJwtUser> {
    if (payload.typ !== 'customer') {
      throw new UnauthorizedException();
    }
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId: payload.sub },
      select: { id: true, publicId: true },
    });
    if (!customer) {
      throw new UnauthorizedException();
    }
    return {
      userId: payload.sub,
      customerPublicId: customer.publicId,
      customerProfileId: customer.id,
    };
  }
}
