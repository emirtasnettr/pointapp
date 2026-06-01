'use client';

import { useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileText, Loader2, X } from 'lucide-react';
import { staffPostMultipart } from '@/lib/api';
import { cn } from '@/lib/cn';

type UploadResult = {
  id: string;
  orderNumbers: number[];
  deliveryCount: number;
};

type Props = {
  deliveryIds: string[];
  orderNumbers: number[];
  onClose: () => void;
  onUploaded: () => void;
};

export function DeliveryCustomerInvoiceUploadModal({
  deliveryIds,
  orderNumbers,
  onClose,
  onUploaded,
}: Props) {
  const fileId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const uploadM = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Fatura dosyası seçin');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('deliveryIds', JSON.stringify(deliveryIds));
      if (invoiceNumber.trim()) fd.append('invoiceNumber', invoiceNumber.trim());
      if (note.trim()) fd.append('note', note.trim());
      return staffPostMultipart<UploadResult>('/deliveries/customer-invoices', fd);
    },
    onSuccess: () => {
      onUploaded();
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const sortedOrders = [...orderNumbers].sort((a, b) => a - b);
  const isBulk = deliveryIds.length > 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-900/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-upload-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="invoice-upload-title" className="text-sm font-semibold text-zinc-900">
                {isBulk ? 'Toplu fatura yükle' : 'Fatura yükle'}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {isBulk
                  ? `${deliveryIds.length} sipariş için tek fatura dosyası`
                  : `Sipariş #${sortedOrders[0] ?? '—'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isBulk ? (
          <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
            Siparişler:{' '}
            <span className="font-mono font-medium text-zinc-800">
              {sortedOrders.map((n) => `#${n}`).join(', ')}
            </span>
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor={fileId} className="text-xs font-medium text-zinc-600">
              Fatura dosyası (PDF veya görsel)
            </label>
            <input
              id={fileId}
              type="file"
              accept=".pdf,image/png,image/jpeg"
              className="mt-1 block w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Fatura no (isteğe bağlı)</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Örn. PNT-2026-00142"
              maxLength={64}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Not (isteğe bağlı)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              placeholder="İç not veya müşteri notu"
              maxLength={500}
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={!file || uploadM.isPending}
            onClick={() => uploadM.mutate()}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white',
              'hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {uploadM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Yükle
          </button>
        </div>
      </div>
    </div>
  );
}
