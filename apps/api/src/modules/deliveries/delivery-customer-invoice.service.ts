import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { addCalendarDaysIstanbul, formatYmdIstanbul, istanbulYmdToUtcBounds } from './istanbul-calendar';
import type { CustomerListDeliveriesDto } from './dto/customer-list-deliveries.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import {
  DELIVERY_CUSTOMER_INVOICE_ALLOWED_MIMES,
  DELIVERY_CUSTOMER_INVOICE_MAX_BYTES,
  DELIVERY_CUSTOMER_INVOICE_MIME_EXT,
  deliveryCustomerInvoiceFileName,
} from './delivery-customer-invoice.constants';

export type DeliveryCustomerInvoiceUploadFile = {
  buffer: Buffer;
  mimetype?: string;
  size: number;
  originalname?: string;
};

const invoiceDetailInclude = {
  file: { select: { id: true, mime: true, path: true, size: true } },
  deliveries: {
    select: {
      delivery: { select: { id: true, orderNumber: true, customerId: true, status: true } },
    },
  },
} as const;

function parseDeliveryIds(raw: string | undefined): string[] {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new BadRequestException('deliveryIds zorunludur (JSON dizi)');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new BadRequestException('deliveryIds geçerli bir JSON dizi olmalıdır');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new BadRequestException('En az bir sipariş seçilmelidir');
  }
  const ids = parsed.map((x) => String(x).trim()).filter(Boolean);
  if (ids.length !== parsed.length) {
    throw new BadRequestException('Geçersiz sipariş kimliği');
  }
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    throw new BadRequestException('Yinelenen sipariş seçimi');
  }
  return unique;
}

@Injectable()
export class DeliveryCustomerInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageAdapter,
  ) {}

  serializeInvoiceRow(
    invoice: Prisma.DeliveryCustomerInvoiceGetPayload<{ include: typeof invoiceDetailInclude }>,
    currentDeliveryId?: string,
  ) {
    const orderNumbers = invoice.deliveries
      .map((d) => d.delivery.orderNumber)
      .sort((a, b) => a - b);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      note: invoice.note,
      mime: invoice.file.mime,
      fileName: deliveryCustomerInvoiceFileName(invoice.file.path, invoice.file.mime),
      createdAt: invoice.createdAt.toISOString(),
      orderNumbers,
      deliveryCount: orderNumbers.length,
      coversThisOrder: currentDeliveryId
        ? invoice.deliveries.some((d) => d.delivery.id === currentDeliveryId)
        : undefined,
    };
  }

  async uploadFromStaff(
    staffUserId: string,
    file: DeliveryCustomerInvoiceUploadFile | undefined,
    deliveryIdsRaw: string | undefined,
    opts?: { invoiceNumber?: string; note?: string },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fatura dosyası zorunludur');
    }
    if (file.size > DELIVERY_CUSTOMER_INVOICE_MAX_BYTES) {
      throw new BadRequestException('Dosya en fazla 40 MB olabilir');
    }
    const mime = file.mimetype?.toLowerCase() ?? '';
    if (!DELIVERY_CUSTOMER_INVOICE_ALLOWED_MIMES.includes(mime)) {
      throw new BadRequestException('Yalnızca PDF veya PNG/JPEG yüklenebilir');
    }
    const ext = DELIVERY_CUSTOMER_INVOICE_MIME_EXT[mime] ?? '';
    const deliveryIds = parseDeliveryIds(deliveryIdsRaw);

    const deliveries = await this.prisma.delivery.findMany({
      where: { id: { in: deliveryIds } },
      select: { id: true, customerId: true, status: true, orderNumber: true },
    });
    if (deliveries.length !== deliveryIds.length) {
      throw new BadRequestException('Bazı siparişler bulunamadı');
    }
    const notDelivered = deliveries.filter((d) => d.status !== DeliveryStatus.DELIVERED);
    if (notDelivered.length) {
      const nums = notDelivered.map((d) => d.orderNumber).join(', ');
      throw new BadRequestException(
        `Yalnızca teslim edilmiş siparişlere fatura yüklenebilir. Uygun değil: #${nums}`,
      );
    }
    const customerIds = [...new Set(deliveries.map((d) => d.customerId))];
    if (customerIds.length !== 1) {
      throw new BadRequestException('Toplu fatura için tüm siparişler aynı müşteriye ait olmalıdır');
    }
    const customerId = customerIds[0]!;

    const storageKey = `delivery-customer-invoices/${customerId}/${randomUUID()}${ext}`;
    const stored = await this.storage.putObject(storageKey, file.buffer, { mime });

    const invoiceNumber = opts?.invoiceNumber?.trim() || null;
    const note = opts?.note?.trim() || null;

    const created = await this.prisma.$transaction(async (tx) => {
      const fileRow = await tx.fileAsset.create({
        data: {
          ownerType: 'delivery_customer_invoice',
          ownerId: customerId,
          kind: 'delivery_customer_invoice',
          path: stored.key,
          mime,
          size: file.size,
        },
      });
      const invoice = await tx.deliveryCustomerInvoice.create({
        data: {
          customerId,
          fileId: fileRow.id,
          uploadedByUserId: staffUserId,
          invoiceNumber,
          note,
          deliveries: {
            create: deliveryIds.map((deliveryId) => ({ deliveryId })),
          },
        },
        include: invoiceDetailInclude,
      });
      return invoice;
    });

    return this.serializeInvoiceRow(created);
  }

  private async loadInvoiceForAccess(invoiceId: string) {
    const row = await this.prisma.deliveryCustomerInvoice.findUnique({
      where: { id: invoiceId.trim() },
      include: {
        file: true,
        deliveries: { select: { delivery: { select: { customerId: true, id: true } } } },
      },
    });
    if (!row) {
      throw new NotFoundException('Fatura bulunamadı');
    }
    return row;
  }

  private resolveCustomerDateRange(q: CustomerListDeliveriesDto): { fromYmd: string; toYmd: string } {
    const hasFrom = Boolean(q.fromDate?.trim());
    const hasTo = Boolean(q.toDate?.trim());
    const today = formatYmdIstanbul(new Date());
    if (hasFrom && hasTo) {
      return { fromYmd: q.fromDate!.trim(), toYmd: q.toDate!.trim() };
    }
    if (hasFrom) {
      return { fromYmd: q.fromDate!.trim(), toYmd: today };
    }
    if (hasTo) {
      return { toYmd: q.toDate!.trim(), fromYmd: addCalendarDaysIstanbul(q.toDate!.trim(), -89) };
    }
    return { toYmd: today, fromYmd: addCalendarDaysIstanbul(today, -89) };
  }

  /** Faturalarım ekranı: teslim edilmiş, faturası yüklenmemiş siparişler + yüklenmiş belgeler. */
  async listOverviewForCustomerUser(userId: string, q: CustomerListDeliveriesDto) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    const take = Math.min(q.take ?? 10, 100);
    const skip = q.skip ?? 0;

    if (!profile) {
      return { pending: [], invoices: [], total: 0, skip, take };
    }

    const { fromYmd, toYmd } = this.resolveCustomerDateRange(q);
    if (fromYmd > toYmd) {
      throw new BadRequestException('Başlangıç tarihi bitişten sonra olamaz');
    }
    let start: Date;
    let end: Date;
    try {
      start = istanbulYmdToUtcBounds(fromYmd).gte;
      end = istanbulYmdToUtcBounds(toYmd).lte;
    } catch {
      throw new BadRequestException('Geçersiz tarih formatı');
    }

    const [pendingRows, invoiceRows] = await Promise.all([
      this.prisma.delivery.findMany({
        where: {
          customerId: profile.id,
          status: DeliveryStatus.DELIVERED,
          updatedAt: { gte: start, lte: end },
          customerInvoiceLinks: { none: {} },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          totalPrice: true,
          updatedAt: true,
        },
      }),
      this.prisma.deliveryCustomerInvoice.findMany({
        where: {
          customerId: profile.id,
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'desc' },
        include: invoiceDetailInclude,
      }),
    ]);

    type MergedRow =
      | { kind: 'pending'; sortAt: Date; delivery: (typeof pendingRows)[number] }
      | { kind: 'invoice'; sortAt: Date; invoice: (typeof invoiceRows)[number] };

    const merged: MergedRow[] = [
      ...pendingRows.map((delivery) => ({
        kind: 'pending' as const,
        sortAt: delivery.updatedAt,
        delivery,
      })),
      ...invoiceRows.map((invoice) => ({
        kind: 'invoice' as const,
        sortAt: invoice.createdAt,
        invoice,
      })),
    ].sort((a, b) => b.sortAt.getTime() - a.sortAt.getTime());

    const total = merged.length;
    const page = merged.slice(skip, skip + take);

    const pending = page
      .filter((row): row is Extract<MergedRow, { kind: 'pending' }> => row.kind === 'pending')
      .map(({ delivery }) => ({
        deliveryId: delivery.id,
        orderNumber: delivery.orderNumber,
        totalPrice: delivery.totalPrice.toString(),
        deliveredAt: delivery.updatedAt.toISOString(),
      }));

    const invoices = page
      .filter((row): row is Extract<MergedRow, { kind: 'invoice' }> => row.kind === 'invoice')
      .map(({ invoice }) => this.serializeInvoiceRow(invoice));

    return { pending, invoices, total, skip, take };
  }

  async streamForStaff(invoiceId: string): Promise<StreamableFile> {
    const row = await this.loadInvoiceForAccess(invoiceId);
    return this.streamFile(row.file.path, row.file.mime);
  }

  async streamForCustomerUser(userId: string, invoiceId: string): Promise<StreamableFile> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new ForbiddenException('Müşteri profili bulunamadı');
    }
    const row = await this.loadInvoiceForAccess(invoiceId);
    if (row.customerId !== profile.id) {
      throw new ForbiddenException('Bu faturaya erişim yok');
    }
    const linked = row.deliveries.some((d) => d.delivery.customerId === profile.id);
    if (!linked) {
      throw new ForbiddenException('Bu faturaya erişim yok');
    }
    return this.streamFile(row.file.path, row.file.mime);
  }

  private streamFile(storagePath: string, mime: string | null): StreamableFile {
    let full: string;
    try {
      full = this.storage.resolveSafePath(storagePath);
    } catch {
      throw new NotFoundException('Fatura dosyası bulunamadı');
    }
    if (!existsSync(full)) {
      throw new NotFoundException('Fatura dosyası bulunamadı');
    }
    const type = mime ?? 'application/octet-stream';
    const stream = createReadStream(full);
    const fileName = deliveryCustomerInvoiceFileName(storagePath, mime);
    return new StreamableFile(stream, {
      type,
      disposition: `inline; filename="${fileName.replace(/"/g, '')}"`,
    });
  }
}
