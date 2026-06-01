import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StaffRbacService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    const rows = await this.prisma.role.findMany({
      orderBy: { slug: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        builtIn: r.builtIn,
        permissions: r.permissions
          .map((rp) => ({
            slug: rp.permission.slug,
            description: rp.permission.description,
          }))
          .sort((a, b) => a.slug.localeCompare(b.slug)),
      })),
    };
  }
}
