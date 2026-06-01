import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CourierLoginDto } from './dto/courier-login.dto';

const JWT_TYP = 'staff';

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async staffLogin(dto: CourierLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
      include: { staffProfile: true },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    if (!user.staffProfile) {
      throw new UnauthorizedException('Bu hesap yönetim personeli değil');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Hesabınız aktif değil. Yöneticinizle iletişime geçin');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      typ: JWT_TYP,
    });

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresInSeconds: 60 * 60 * 24 * 7,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        appRole: user.staffProfile.appRole,
        staffProfileId: user.staffProfile.id,
      },
    };
  }
}
