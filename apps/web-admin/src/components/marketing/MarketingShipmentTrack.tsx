'use client';

import { useState } from 'react';
import {
  CircleCheck,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Package,
  PackageOpen,
  Phone,
  Search,
  Truck,
  UserRoundCheck,
  XCircle,
} from 'lucide-react';
import { deliveryStatusLabel } from '@/lib/delivery-status';
import { trackDeliveriesByPhone, type PublicTrackedDelivery } from '@/lib/delivery-track-public';
import { isValidTrPhone, normalizeTrPhone } from '@/lib/guest-delivery-form';
import { cn } from '@/lib/cn';

const EMPTY_MESSAGE = 'Bu numara ile gönderi bulunamamıştır.';

const TYPE_LABEL: Record<string, string> = {
  DOCUMENT: 'Evrak',
  PACKAGE: 'Paket',
};

const STATUS_STYLE: Record<
  string,
  { Icon: typeof Clock; ring: string; bg: string; text: string }
> = {
  PENDING: { Icon: Clock, ring: 'ring-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-800' },
  POOL: { Icon: Search, ring: 'ring-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-800' },
  COURIER_ASSIGNED: {
    Icon: UserRoundCheck,
    ring: 'ring-brand/30',
    bg: 'bg-brand/12',
    text: 'text-emerald-900',
  },
  COURIER_EN_ROUTE: {
    Icon: Truck,
    ring: 'ring-brand/30',
    bg: 'bg-brand/15',
    text: 'text-emerald-900',
  },
  PACKAGE_PICKED_UP: {
    Icon: PackageOpen,
    ring: 'ring-emerald-600/25',
    bg: 'bg-emerald-500/12',
    text: 'text-emerald-900',
  },
  DELIVERED: {
    Icon: CircleCheck,
    ring: 'ring-zinc-400/30',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-700',
  },
  CANCELLED: { Icon: XCircle, ring: 'ring-red-400/25', bg: 'bg-red-500/10', text: 'text-red-800' },
};

function formatOrderNo(n: number) {
  return `#${n.toLocaleString('tr-TR')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  const Icon = style.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        style.bg,
        style.text,
        style.ring,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {deliveryStatusLabel(status)}
    </span>
  );
}

function DeliveryCard({ item }: { item: PublicTrackedDelivery }) {
  const TypeIcon = item.type === 'DOCUMENT' ? FileText : Package;

  return (
    <article className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-soft transition hover:border-brand/20 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sipariş no</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-zinc-900">
            {formatOrderNo(item.orderNumber)}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 font-medium">
          <TypeIcon className="h-3.5 w-3.5 text-brand" aria-hidden />
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
        <span className="rounded-lg bg-zinc-100 px-2 py-1 font-medium">{formatDate(item.createdAt)}</span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-zinc-500">Gönderen</dt>
          <dd className="mt-0.5 font-medium text-zinc-900">{item.senderName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-zinc-500">Alıcı</dt>
          <dd className="mt-0.5 font-medium text-zinc-900">{item.recipientName}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span>
            <span className="font-medium text-zinc-800">Alış:</span> {item.pickupSummary}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>
            <span className="font-medium text-zinc-800">Teslim:</span> {item.dropoffSummary}
          </span>
        </p>
      </div>
    </article>
  );
}

export function MarketingShipmentTrack() {
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [items, setItems] = useState<PublicTrackedDelivery[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!isValidTrPhone(phone)) {
      setErr('Geçerli bir cep telefonu girin (ör. 0555 123 45 67).');
      return;
    }
    setPending(true);
    setSearched(false);
    try {
      const data = await trackDeliveriesByPhone(normalizeTrPhone(phone));
      setItems(data.items);
      setSearched(true);
    } catch (message) {
      setErr(message instanceof Error ? message : 'Sorgu yapılamadı.');
      setItems([]);
      setSearched(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
          <Search className="h-3.5 w-3.5" aria-hidden />
          Gönderi takibi
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Gönderinizi sorgulayın
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-600">
          Kayıtlı telefon numaranızla son gönderilerinizi görüntüleyin. Gönderen veya alıcı olarak kayıtlı
          siparişler listelenir.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-10 rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50/90 to-white p-6 shadow-soft sm:p-8"
      >
        <label htmlFor="track-phone" className="block text-sm font-semibold text-zinc-900">
          Telefon numarası
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Phone
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden
            />
            <input
              id="track-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="0555 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-zinc-200/90 bg-white py-3 pl-10 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            Sorgula
          </button>
        </div>
        {err ? (
          <p className="mt-3 rounded-xl border border-red-200/90 bg-red-50 px-3 py-2 text-sm text-red-800">
            {err}
          </p>
        ) : null}
      </form>

      {searched ? (
        <div className="mt-10">
          {items.length === 0 ? (
            <div
              className="rounded-2xl border border-zinc-200/90 bg-white px-6 py-10 text-center shadow-sm"
              role="status"
            >
              <p className="text-sm font-medium text-zinc-700">{EMPTY_MESSAGE}</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-zinc-500">
                Son <span className="font-semibold text-zinc-700">{items.length}</span> gönderi
                listeleniyor.
              </p>
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.orderNumber}>
                    <DeliveryCard item={item} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      <p className="mt-10 text-center text-xs text-zinc-500">
        Üye misiniz?{' '}
        <a href="/musteri/giris" className="font-semibold text-brand hover:underline">
          Müşteri panelinden
        </a>{' '}
        tüm sipariş geçmişinize ulaşabilirsiniz.
      </p>
    </div>
  );
}
