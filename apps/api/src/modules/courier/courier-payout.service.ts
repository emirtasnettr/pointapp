import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, PayoutStatus, Prisma } from '@prisma/client';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourierPayoutDto } from './dto/create-courier-payout.dto';
import {
  PAYOUT_INVOICE_ALLOWED_MIMES,
  PAYOUT_INVOICE_MAX_BYTES,
  PAYOUT_INVOICE_MIME_EXT,
} from './payout-invoice.constants';

export type PayoutInvoiceUpload = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

function maskIban(iban: string | null | undefined): string | null {
  if (!iban) return null;
  const s = iban.replace(/\s/g, '').toUpperCase();
  if (s.length < 8) return '****';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function serialize(row: {
  id: string;
  amount: Prisma.Decimal;
  status: PayoutStatus;
  iban: string | null;
  note: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  invoiceFile?: { mime: string | null } | null;
}) {
  return {
    id: row.id,
    amount: row.amount.toFixed(2),
    status: row.status,
    ibanMasked: maskIban(row.iban),
    note: row.note,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    hasInvoice: Boolean(row.invoiceFile),
    invoiceMime: row.invoiceFile?.mime ?? null,
  };
}

@Injectable()
export class CourierPayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageAdapter,
  ) {}

  async list(userId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!courier) {
      throw new NotFoundException('Kurye profili bulunamadı');
    }
    const rows = await this.prisma.payoutRequest.findMany({
      where: { courierId: courier.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { invoiceFile: { select: { mime: true } } },
    });
    return { items: rows.map(serialize) };
  }

  async create(userId: string, dto: CreateCourierPayoutDto, invoice: PayoutInvoiceUpload) {
    if (!invoice?.buffer?.length) {
      throw new BadRequestException('Ödeme talebi için fatura dosyası zorunludur');
    }
    if (invoice.size > PAYOUT_INVOICE_MAX_BYTES) {
      throw new BadRequestException('Fatura dosyası en fazla 40 MB olabilir');
    }
    const mime = invoice.mimetype?.toLowerCase() ?? '';
    const ext = PAYOUT_INVOICE_MIME_EXT[mime];
    if (!ext) {
      throw new BadRequestException('Yalnızca PNG, JPG, JPEG veya PDF yükleyebilirsiniz');
    }

    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        iban: true,
        wallet: { select: { balance: true, currency: true } },
      },
    });
    if (!courier) {
      throw new NotFoundException('Kurye profili bulunamadı');
    }
    if (!courier.wallet) {
      throw new BadRequestException('Cüzdan kaydı bulunamadı');
    }
    const iban = courier.iban?.replace(/\s/g, '').toUpperCase() ?? '';
    if (!iban || !/^TR\d{24}$/.test(iban)) {
      throw new BadRequestException(
        'Ödeme talebi için önce Hesap sekmesinden geçerli bir IBAN kaydedin.',
      );
    }

    const deliveredCount = await this.prisma.delivery.count({
      where: { courierId: courier.id, status: DeliveryStatus.DELIVERED },
    });
    if (deliveredCount < 1) {
      throw new BadRequestException(
        'Ödeme talebi yalnızca en az bir teslimatı tamamladıktan sonra mümkündür.',
      );
    }

    const todayRequests = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "payout_requests"
        WHERE "courierId" = ${courier.id}
          AND (timezone('Europe/Istanbul', "createdAt"))::date
            = (timezone('Europe/Istanbul', CURRENT_TIMESTAMP))::date
      `,
    );
    const todayCount = Number(todayRequests[0]?.count ?? 0);
    if (todayCount >= 1) {
      throw new ConflictException(
        'Günde yalnızca bir ödeme talebi oluşturabilirsiniz. Yarın tekrar deneyin.',
      );
    }

    const open = await this.prisma.payoutRequest.findFirst({
      where: {
        courierId: courier.id,
        status: { in: [PayoutStatus.PENDING, PayoutStatus.APPROVED] },
      },
    });
    if (open) {
      throw new ConflictException(
        'İncelenen veya onaylanmış bir ödeme talebiniz var. Yeni talep için sonuç bekleyin.',
      );
    }

    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException('Tutar sıfırdan büyük olmalıdır');
    }
    const min = new Prisma.Decimal('1');
    if (amount.lt(min)) {
      throw new BadRequestException('Minimum talep tutarı 1 ₺');
    }
    if (amount.gt(courier.wallet.balance)) {
      throw new BadRequestException('Tutar bakiyeden fazla olamaz');
    }

    const storageKey = `payout-invoices/${courier.id}/${randomUUID()}${ext}`;
    const stored = await this.storage.putObject(storageKey, invoice.buffer, {
      mime,
      acl: 'private',
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        const file = await tx.fileAsset.create({
          data: {
            ownerType: 'payout_request',
            ownerId: null,
            kind: 'payout_invoice',
            path: stored.key,
            mime: stored.mime ?? mime,
            size: invoice.size,
          },
        });

        const payout = await tx.payoutRequest.create({
          data: {
            courierId: courier.id,
            amount,
            status: PayoutStatus.PENDING,
            iban,
            note: dto.note?.trim() ? dto.note.trim() : null,
            invoiceFileId: file.id,
          },
        });

        await tx.fileAsset.update({
          where: { id: file.id },
          data: { ownerId: payout.id },
        });
      });
    } catch (e) {
      await this.storage.deleteObject(stored.key).catch(() => undefined);
      throw e;
    }

    return this.list(userId);
  }
}
