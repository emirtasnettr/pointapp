import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type StaffJwtPayload = { sub: string; typ?: string };

export type StaffJwtUser = {
  userId: string;
  staffProfileId: string;
  appRole: AppRole;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, 'staff-jwt') {
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

  async validate(payload: StaffJwtPayload): Promise<StaffJwtUser> {
    if (payload.typ !== 'staff') {
      throw new UnauthorizedException();
    }
    const staff = await this.prisma.staffProfile.findUnique({
      where: { userId: payload.sub },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, status: true } },
      },
    });
    if (!staff) {
      throw new UnauthorizedException();
    }
    if (staff.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Hesap aktif değil');
    }
    return {
      userId: payload.sub,
      staffProfileId: staff.id,
      appRole: staff.appRole,
      email: staff.user.email,
      firstName: staff.user.firstName,
      lastName: staff.user.lastName,
    };
  }
}
