import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CourierLoginDto } from './dto/courier-login.dto';
import { CustomerChangePasswordDto } from './dto/customer-change-password.dto';

const JWT_TYP = 'customer';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async customerLogin(dto: CourierLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
      include: { customerProfile: true },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    if (!user.customerProfile) {
      throw new UnauthorizedException('Bu hesap müşteri hesabı değil');
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
        customerPublicId: user.customerProfile.publicId,
        customerProfileId: user.customerProfile.id,
      },
    };
  }

  async changePassword(userId: string, dto: CustomerChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      throw new BadRequestException('Bu hesap için şifre ile giriş tanımlı değil. Destek ile iletişime geçin.');
    }
    const currentOk = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new UnauthorizedException('Mevcut şifre hatalı');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Yeni şifre mevcut şifreden farklı olmalıdır');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { ok: true as const };
  }
}
