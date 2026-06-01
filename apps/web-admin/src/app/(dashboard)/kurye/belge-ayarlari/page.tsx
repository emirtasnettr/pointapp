'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import {
  COURIER_TYPE_TR,
  type CourierDocKindApi,
  type CourierTypeApi,
  type DocumentRequirement,
} from '@/lib/courier-onboarding-admin';
import { cn } from '@/lib/cn';

const QUERY_KEY = ['staff', 'courier-document-requirements'] as const;

function fetchRequirements(type: CourierTypeApi) {
  return apiGet<{ items: DocumentRequirement[] }>(
    `/staff/courier/document-requirements?courierType=${type}`,
  );
}

export default function CourierDocumentSettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<CourierTypeApi>('INDIVIDUAL');
  const [label, setLabel] = useState('');
  const [hint, setHint] = useState('');
  const [kind, setKind] = useState<CourierDocKindApi>('FILE');
  const [required, setRequired] = useState(true);

  const q = useQuery({
    queryKey: [...QUERY_KEY, tab],
    queryFn: () => fetchRequirements(tab),
  });

  const createM = useMutation({
    mutationFn: () =>
      apiPost<DocumentRequirement>('/staff/courier/document-requirements', {
        courierType: tab,
        kind,
        label: label.trim(),
        hint: hint.trim() || undefined,
        required,
        sortOrder: (q.data?.items.length ?? 0) * 10,
      }),
    onSuccess: () => {
      setLabel('');
      setHint('');
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const toggleM = useMutation({
    mutationFn: (row: DocumentRequirement) =>
      apiPatch<DocumentRequirement>(`/staff/courier/document-requirements/${row.id}`, {
        active: !row.active,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => apiDelete(`/staff/courier/document-requirements/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return (
    <>
      <PageHeader
        title="Kurye belge ayarları"
        description="Bireysel ve esnaf kuryeler için ayrı ayrı talep edilecek metin alanları ve dosya yüklemeleri tanımlayın. Etiketleri siz belirlersiniz."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(['INDIVIDUAL', 'MERCHANT'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              tab === t ? 'bg-brand text-white shadow-sm' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50',
            )}
          >
            {COURIER_TYPE_TR[t]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <GlassCard className="overflow-hidden p-0">
          {q.isLoading ? (
            <p className="flex items-center gap-2 p-6 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
            </p>
          ) : q.isError ? (
            <p className="p-6 text-sm text-red-600">{(q.error as Error).message}</p>
          ) : !q.data?.items.length ? (
            <p className="p-6 text-sm text-zinc-500">
              {COURIER_TYPE_TR[tab]} için henüz alan tanımlanmadı. Sağdan yeni alan ekleyin.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {q.data.items.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">
                      {row.label}
                      {!row.active ? (
                        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                          Pasif
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {row.kind === 'FILE' ? 'Dosya' : 'Metin'}
                      {row.required ? ' · Zorunlu' : ' · İsteğe bağlı'}
                      {row.hint ? ` · ${row.hint}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleM.mutate(row)}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      {row.active ? 'Pasifleştir' : 'Aktifleştir'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`"${row.label}" alanını silmek istediğinize emin misiniz?`)) {
                          deleteM.mutate(row.id);
                        }
                      }}
                      className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Plus className="h-4 w-4 text-brand" />
            Yeni alan — {COURIER_TYPE_TR[tab]}
          </h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!label.trim()) return;
              createM.mutate();
            }}
          >
            <label className="block text-xs font-medium text-zinc-600">
              Etiket (kuryede görünen ad)
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Örn. Ehliyet fotokopisi"
                maxLength={120}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Açıklama (isteğe bağlı)
              <input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="PDF veya net fotoğraf"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Tür
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as CourierDocKindApi)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="FILE">Dosya yükleme</option>
                <option value="TEXT">Metin bilgisi</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
              Zorunlu alan
            </label>
            {createM.isError ? (
              <p className="text-xs text-red-600">{(createM.error as Error).message}</p>
            ) : null}
            <button
              type="submit"
              disabled={createM.isPending || !label.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {createM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Ekle
            </button>
          </form>
        </GlassCard>
      </div>
    </>
  );
}
