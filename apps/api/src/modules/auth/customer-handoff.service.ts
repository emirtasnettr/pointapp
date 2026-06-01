import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

const JWT_TYP = 'customer';
const HANDOFF_TTL_MS = 2 * 60 * 1000;
const HANDOFF_AUDIENCE = 'customer';

@Injectable()
export class CustomerHandoffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async createCode(userId: string): Promise<{ code: string; expiresAt: string }> {
    const code = randomBytes(32).toString('base64url');
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);

    await this.prisma.authHandoffCode.create({
      data: {
        userId,
        codeHash,
        audience: HANDOFF_AUDIENCE,
        expiresAt,
      },
    });

    return { code, expiresAt: expiresAt.toISOString() };
  }

  async redeemCode(codeRaw: string) {
    const code = codeRaw?.trim();
    if (!code || code.length < 16) {
      throw new BadRequestException('Geçersiz oturum kodu');
    }

    const candidates = await this.prisma.authHandoffCode.findMany({
      where: {
        audience: HANDOFF_AUDIENCE,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            customerProfile: { select: { id: true, publicId: true } },
          },
        },
      },
    });

    for (const row of candidates) {
      const match = await bcrypt.compare(code, row.codeHash);
      if (!match) continue;

      if (!row.user.customerProfile) {
        throw new UnauthorizedException('Müşteri profili bulunamadı');
      }

      await this.prisma.authHandoffCode.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });

      const accessToken = await this.jwt.signAsync({
        sub: row.userId,
        typ: JWT_TYP,
      });

      return {
        accessToken,
        tokenType: 'Bearer' as const,
        expiresInSeconds: 60 * 60 * 24 * 7,
        user: {
          customerPublicId: row.user.customerProfile.publicId,
          customerProfileId: row.user.customerProfile.id,
        },
      };
    }

    throw new UnauthorizedException('Oturum kodu geçersiz veya süresi dolmuş');
  }
}
