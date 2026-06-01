import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppRole, Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { ListStaffUsersDto } from './dto/list-staff-users.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

const STAFF_ASSIGNABLE_ROLES: readonly AppRole[] = [
  AppRole.SYSTEM_ADMIN,
  AppRole.GENERAL_MANAGER,
  AppRole.OPERATIONS_MANAGER,
  AppRole.OPERATIONS_SPECIALIST,
  AppRole.ACCOUNTING_SPECIALIST,
];

const userSelect = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

const staffInclude = {
  user: { select: userSelect },
} as const;

type StaffRow = Prisma.StaffProfileGetPayload<{ include: typeof staffInclude }>;

@Injectable()
export class StaffUsersService {
  constructor(private readonly prisma: PrismaService) {}

  private assertSystemAdmin(actor: StaffJwtUser) {
    if (actor.appRole !== AppRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Yalnızca sistem yöneticisi personel hesabı yönetebilir');
    }
  }

  private normalizeTrMobile(raw: string): string {
    const s = raw.replace(/\s|-/g, '').trim();
    if (s.startsWith('+90')) {
      const rest = s.slice(3);
      if (/^5\d{9}$/.test(rest)) return `+90${rest}`;
      throw new BadRequestException('Geçersiz telefon numarası');
    }
    if (s.startsWith('90') && /^905\d{9}$/.test(s)) return `+${s}`;
    if (s.startsWith('0') && /^05\d{9}$/.test(s)) return `+9${s.slice(1)}`;
    if (/^5\d{9}$/.test(s)) return `+90${s}`;
    throw new BadRequestException('Geçersiz telefon numarası');
  }

  private serialize(row: StaffRow) {
    const u = row.user;
    return {
      userId: u.id,
      staffProfileId: row.id,
      appRole: row.appRole,
      email: u.email,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      staffCreatedAt: row.createdAt.toISOString(),
    };
  }

  private async countActiveSystemAdmins(excludeUserId?: string): Promise<number> {
    return this.prisma.staffProfile.count({
      where: {
        appRole: AppRole.SYSTEM_ADMIN,
        user: {
          status: UserStatus.ACTIVE,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
      },
    });
  }

  private async getStaffRow(userId: string): Promise<StaffRow> {
    const row = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: staffInclude,
    });
    if (!row) throw new NotFoundException('Personel hesabı bulunamadı');
    return row;
  }

  listAssignableRoles(actor: StaffJwtUser) {
    this.assertSystemAdmin(actor);
    return {
      items: STAFF_ASSIGNABLE_ROLES.map((role) => ({ role })),
    };
  }

  async list(_actor: StaffJwtUser, query: ListStaffUsersDto) {
    this.assertSystemAdmin(_actor);
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    const q = query.q?.trim();
    const where: Prisma.StaffProfileWhereInput = {};
    if (q) {
      const mode = Prisma.QueryMode.insensitive;
      where.OR = [
        { user: { email: { contains: q, mode } } },
        { user: { phone: { contains: q, mode } } },
        { user: { firstName: { contains: q, mode } } },
        { user: { lastName: { contains: q, mode } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: staffInclude,
      }),
      this.prisma.staffProfile.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.serialize(r)),
      total,
      skip,
      take,
    };
  }

  async getOne(actor: StaffJwtUser, userId: string) {
    this.assertSystemAdmin(actor);
    return this.serialize(await this.getStaffRow(userId.trim()));
  }

  async create(actor: StaffJwtUser, dto: CreateStaffUserDto) {
    this.assertSystemAdmin(actor);
    const email = dto.email.trim().toLowerCase();
    const phone = this.normalizeTrMobile(dto.phone);

    const emailBusy = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (emailBusy) throw new ConflictException('Bu e-posta adresi zaten kayıtlı');

    const phoneBusy = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (phoneBusy) throw new ConflictException('Bu telefon numarası zaten kayıtlı');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          phoneVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
        },
        select: userSelect,
      });
      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          appRole: dto.appRole,
        },
        include: staffInclude,
      });
      return profile;
    });

    return this.serialize(created);
  }

  async update(actor: StaffJwtUser, userId: string, dto: UpdateStaffUserDto) {
    this.assertSystemAdmin(actor);
    const id = userId.trim();
    const row = await this.getStaffRow(id);

    if (dto.appRole && dto.appRole !== row.appRole) {
      if (id === actor.userId && dto.appRole !== AppRole.SYSTEM_ADMIN) {
        throw new BadRequestException('Kendi sistem yöneticisi rolünüzü değiştiremezsiniz');
      }
      if (row.appRole === AppRole.SYSTEM_ADMIN && dto.appRole !== AppRole.SYSTEM_ADMIN) {
        const others = await this.countActiveSystemAdmins(id);
        if (others === 0) {
          throw new BadRequestException('Son aktif sistem yöneticisinin rolü değiştirilemez');
        }
      }
    }

    let phone: string | undefined;
    if (dto.phone !== undefined) {
      phone = this.normalizeTrMobile(dto.phone);
      const phoneBusy = await this.prisma.user.findFirst({
        where: { phone, id: { not: id } },
        select: { id: true },
      });
      if (phoneBusy) throw new ConflictException('Bu telefon numarası başka bir hesapta kayıtlı');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.firstName !== undefined || dto.lastName !== undefined || phone !== undefined) {
        await tx.user.update({
          where: { id },
          data: {
            ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
            ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
            ...(phone !== undefined ? { phone } : {}),
          },
        });
      }
      if (dto.appRole !== undefined) {
        await tx.staffProfile.update({
          where: { userId: id },
          data: { appRole: dto.appRole },
        });
      }
      return tx.staffProfile.findUniqueOrThrow({
        where: { userId: id },
        include: staffInclude,
      });
    });

    return this.serialize(updated);
  }

  async setStatus(actor: StaffJwtUser, userId: string, status: 'ACTIVE' | 'PASSIVE') {
    this.assertSystemAdmin(actor);
    const id = userId.trim();
    const row = await this.getStaffRow(id);
    const user = row.user;

    if (id === actor.userId) {
      throw new BadRequestException('Kendi hesabınızın durumunu buradan değiştiremezsiniz');
    }

    if (status === UserStatus.PASSIVE && user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Yalnızca aktif hesap pasife alınabilir');
    }
    if (status === UserStatus.ACTIVE && user.status !== UserStatus.PASSIVE) {
      throw new BadRequestException('Yalnızca pasif hesap aktifleştirilebilir');
    }

    if (status === UserStatus.PASSIVE && row.appRole === AppRole.SYSTEM_ADMIN) {
      const others = await this.countActiveSystemAdmins(id);
      if (others === 0) {
        throw new BadRequestException('Son aktif sistem yöneticisi pasife alınamaz');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { status },
      });
      if (status === UserStatus.PASSIVE) {
        await tx.refreshToken.deleteMany({ where: { userId: id } });
      }
    });

    return this.serialize(await this.getStaffRow(id));
  }

  async setPassword(actor: StaffJwtUser, userId: string, password: string) {
    this.assertSystemAdmin(actor);
    const id = userId.trim();
    await this.getStaffRow(id);

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    if (id !== actor.userId) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    return this.serialize(await this.getStaffRow(id));
  }
}
