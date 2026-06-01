import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getJwtSecret } from '../../config/jwt-secret';
import { isPublicLocalFileKey } from '../../common/public-file-keys';
import { PrismaService } from '../../prisma/prisma.service';

function parseBearer(authorization?: string): string | null {
  const raw = authorization?.trim();
  if (!raw?.toLowerCase().startsWith('bearer ')) return null;
  return raw.slice(7).trim() || null;
}

@Injectable()
export class LocalFilesAccessService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async assertMayReadLocalKey(key: string, authorization?: string): Promise<void> {
    if (isPublicLocalFileKey(key)) return;

    const token = parseBearer(authorization);
    if (!token) throw new NotFoundException();

    let payload: { sub?: string; typ?: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: getJwtSecret(this.config) });
    } catch {
      throw new NotFoundException();
    }

    if (payload.typ === 'staff') return;

    if (payload.typ === 'courier' && key.startsWith('courier-onboarding/')) {
      const courier = await this.prisma.courierProfile.findUnique({
        where: { userId: payload.sub },
        select: { id: true },
      });
      if (courier && key.startsWith(`courier-onboarding/${courier.id}/`)) {
        return;
      }
    }

    throw new NotFoundException();
  }
}
