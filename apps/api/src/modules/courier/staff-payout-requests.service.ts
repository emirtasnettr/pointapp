import { createReadStream, existsSync } from 'node:fs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PayoutStatus, Prisma, WalletLedgerType } from '@prisma/client';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { PrismaService } from '../../prisma/prisma.service';
import { ListStaffPayoutRequestsDto } from './dto/list-staff-payout-requests.dto';
import { PatchStaffPayoutRequestDto } from './dto/patch-staff-payout-request.dto';

const payoutCourierInclude = {
  courier: {
    select: {
      publicId: true,
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      wallet: { select: { balance: true, currency: true } },
    },
  },
  invoiceFile: { select: { id: true, mime: true, path: true } },
} as const;

type PayoutWithCourier = Prisma.PayoutRequestGetPayload<{ include: typeof payoutCourierInclude }>;

function courierDisplayName(c: PayoutWithCourier['courier']): string {
  const n = `${c.user.firstName ?? ''} ${c.user.lastName ?? ''}`.trim();
  if (n) return n;
  if (c.user.email) return c.user.email;
  return c.publicId;
}

function invoiceFileName(path: string, mime: string | null | undefined): string {
  const base = path.split('/').pop() ?? 'fatura';
  if (base.includes('.')) return base;
  if (mime === 'application/pdf') return `${base}.pdf`;
  if (mime === 'image/png') return `${base}.png`;
  if (mime === 'image/jpeg' || mime === 'image/jpg') return `${base}.jpg`;
  return base;
}

function toListItem(r: PayoutWithCourier) {
  return {
    id: r.id,
    amount: r.amount.toFixed(2),
    status: r.status,
    iban: r.iban,
    note: r.note,
    paidAt: r.paidAt?.toISOString() ?? null,
    paidByUserId: r.paidByUserId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    invoice: r.invoiceFile
      ? {
          mime: r.invoiceFile.mime,
          fileName: invoiceFileName(r.invoiceFile.path, r.invoiceFile.mime),
        }
      : null,
    courier: {
      publicId: r.courier.publicId,
      displayName: courierDisplayName(r.courier),
      phone: r.courier.user.phone,
      walletBalance: r.courier.wallet?.balance.toFixed(2) ?? null,
      walletCurrency: r.courier.wallet?.currency ?? 'TRY',
    },
  };
}

@Injectable()
export class StaffPayoutRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageAdapter,
  ) {}

  async streamInvoice(id: string): Promise<StreamableFile> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new BadRequestException('Geçersiz talep');
    }
    const row = await this.prisma.payoutRequest.findUnique({
      where: { id: trimmed },
      include: { invoiceFile: true },
    });
    if (!row) {
      throw new NotFoundException('Talep bulunamadı');
    }
    if (!row.invoiceFile) {
      throw new NotFoundException('Bu talep için fatura dosyası yok');
    }
    let full: string;
    try {
      full = this.storage.resolveSafePath(row.invoiceFile.path);
    } catch {
      throw new NotFoundException('Fatura dosyası bulunamadı');
    }
    if (!existsSync(full)) {
      throw new NotFoundException('Fatura dosyası bulunamadı');
    }
    const mime = row.invoiceFile.mime ?? 'application/octet-stream';
    const stream = createReadStream(full);
    const fileName = invoiceFileName(row.invoiceFile.path, row.invoiceFile.mime);
    return new StreamableFile(stream, {
      type: mime,
      disposition: `inline; filename="${fileName.replace(/"/g, '')}"`,
    });
  }

  async list(query: ListStaffPayoutRequestsDto) {
    const where = query.status ? { status: query.status } : {};

    const [rows, statusGroups] = await Promise.all([
      this.prisma.payoutRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: payoutCourierInclude,
      }),
      this.prisma.payoutRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const g of statusGroups) {
      counts[g.status] = g._count._all;
    }

    return {
      counts,
      items: rows.map(toListItem),
    };
  }

  async patch(id: string, dto: PatchStaffPayoutRequestDto, actorUserId: string) {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new BadRequestException('Geçersiz talep');
    }

    const target = dto.status as PayoutStatus;

    if (target === PayoutStatus.APPROVED) {
      const row = await this.prisma.payoutRequest.findUnique({ where: { id: trimmed } });
      if (!row) throw new NotFoundException('Talep bulunamadı');
      if (row.status !== PayoutStatus.PENDING) {
        throw new ConflictException('Yalnızca beklemedeki talepler onaylanabilir');
      }
      const updated = await this.prisma.payoutRequest.update({
        where: { id: trimmed },
        data: { status: PayoutStatus.APPROVED },
        include: payoutCourierInclude,
      });
      return toListItem(updated);
    }

    if (target === PayoutStatus.REJECTED) {
      const row = await this.prisma.payoutRequest.findUnique({ where: { id: trimmed } });
      if (!row) throw new NotFoundException('Talep bulunamadı');
      if (row.status === PayoutStatus.PAID) {
        throw new ConflictException('Ödenmiş talep reddedilemez');
      }
      if (row.status === PayoutStatus.REJECTED) {
        throw new ConflictException('Talep zaten reddedilmiş');
      }
      const updated = await this.prisma.payoutRequest.update({
        where: { id: trimmed },
        data: { status: PayoutStatus.REJECTED },
        include: payoutCourierInclude,
      });
      return toListItem(updated);
    }

    if (target === PayoutStatus.PAID) {
      return this.markPaid(trimmed, actorUserId);
    }

    throw new BadRequestException('Desteklenmeyen durum');
  }

  private async markPaid(id: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.payoutRequest.findUnique({
        where: { id },
        include: {
          courier: { include: { wallet: true } },
        },
      });
      if (!row) throw new NotFoundException('Talep bulunamadı');
      if (row.status === PayoutStatus.PAID) {
        throw new ConflictException('Talep zaten ödendi olarak işaretli');
      }
      if (row.status === PayoutStatus.REJECTED) {
        throw new ConflictException('Reddedilmiş talep ödenemez');
      }
      if (row.status !== PayoutStatus.PENDING && row.status !== PayoutStatus.APPROVED) {
        throw new BadRequestException('Geçersiz talep durumu');
      }

      const wallet = row.courier.wallet;
      if (!wallet) {
        throw new BadRequestException('Kurye cüzdanı bulunamadı');
      }
      if (wallet.balance.lt(row.amount)) {
        throw new BadRequestException(
          'Cüzdan bakiyesi talep tutarından az. Ödeme yapılmadı; bakiye veya talep tutarını kontrol edin.',
        );
      }

      await tx.courierWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: row.amount } },
      });

      await tx.walletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          amount: row.amount.mul(new Prisma.Decimal(-1)),
          type: WalletLedgerType.PAYOUT,
          refType: 'payout_request',
          refId: row.id,
          meta: { source: 'staff_payout_mark_paid' } as Prisma.InputJsonValue,
        },
      });

      const updated = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: PayoutStatus.PAID,
          paidAt: new Date(),
          paidByUserId: actorUserId,
        },
        include: payoutCourierInclude,
      });

      return toListItem(updated);
    });
  }
}
