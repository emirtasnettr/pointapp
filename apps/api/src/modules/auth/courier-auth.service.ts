import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { buildCourierAccountState } from '../courier/courier-account.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CourierLoginDto } from './dto/courier-login.dto';

const JWT_TYP = 'courier';

@Injectable()
export class CourierAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async courierLogin(dto: CourierLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
      include: { courierProfile: true },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    if (!user.courierProfile) {
      throw new UnauthorizedException('Bu hesap kurye hesabı değil');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      typ: JWT_TYP,
    });

    const profile = user.courierProfile;

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresInSeconds: 60 * 60 * 24 * 7,
      user: {
        email: user.email,
        courierPublicId: profile.publicId,
      },
      account: buildCourierAccountState(user, profile),
    };
  }
}
