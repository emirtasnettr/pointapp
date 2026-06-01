'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/customer/GlassCard';
import { apiDeleteAuth, apiGetAuth, apiPatchAuth, apiPostAuth } from '@/lib/api';
import type { CustomerSavedAddressRow } from '@/lib/customer-address-types';
import { fetchGeoDistricts, fetchGeoNeighborhoods } from '@/lib/geography-public';

const fieldClass =
  'mt-1 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900';

type FormState = {
  title: string;
  districtId: string;
  neighborhoodId: string;
  line1: string;
};

const emptyForm = (): FormState => ({
  title: '',
  districtId: '',
  neighborhoodId: '',
  line1: '',
});

export function CustomerAddressesManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CustomerSavedAddressRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [err, setErr] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['customer', 'addresses'],
    queryFn: () => apiGetAuth<{ items: CustomerSavedAddressRow[] }>('/customer/addresses'),
  });

  const districtsQuery = useQuery({
    queryKey: ['geography', 'districts'],
    queryFn: fetchGeoDistricts,
    staleTime: 60_000,
  });

  const neighborhoodsQuery = useQuery({
    queryKey: ['geography', 'neighborhoods', form.districtId],
    queryFn: () => fetchGeoNeighborhoods(form.districtId),
    enabled: Boolean(form.districtId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: form.title.trim(),
        neighborhoodId: form.neighborhoodId,
        line1: form.line1.trim(),
      };
      if (editing) {
        return apiPatchAuth<CustomerSavedAddressRow>(`/customer/addresses/${editing.id}`, body);
      }
      return apiPostAuth<CustomerSavedAddressRow>('/customer/addresses', body);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['customer', 'addresses'] });
      setCreating(false);
      setEditing(null);
      setForm(emptyForm());
      setErr(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteAuth(`/customer/addresses/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['customer', 'addresses'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm());
    setErr(null);
  }

  function openEdit(a: CustomerSavedAddressRow) {
    setEditing(a);
    setCreating(false);
    setForm({
      title: a.title,
      districtId: a.neighborhood?.district.id ?? '',
      neighborhoodId: a.neighborhood?.id ?? '',
      line1: a.line1,
    });
    setErr(null);
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-4">
      {err ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {err}
        </p>
      ) : null}

      {!showForm ? (
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Yeni adres
        </button>
      ) : null}

      {showForm ? (
        <GlassCard className="space-y-3">
          <h2 className="text-sm font-semibold">{editing ? 'Adresi düzenle' : 'Yeni adres'}</h2>
          <label className="block text-xs text-zinc-500">
            Başlık
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={fieldClass}
              placeholder="Ev, Ofis…"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            İlçe
            <select
              value={form.districtId}
              onChange={(e) => setForm((f) => ({ ...f, districtId: e.target.value, neighborhoodId: '' }))}
              className={fieldClass}
            >
              <option value="">Seçin</option>
              {(districtsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            Mahalle
            <select
              value={form.neighborhoodId}
              onChange={(e) => setForm((f) => ({ ...f, neighborhoodId: e.target.value }))}
              disabled={!form.districtId}
              className={fieldClass}
            >
              <option value="">Seçin</option>
              {(neighborhoodsQuery.data ?? []).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            Sokak / bina
            <input
              value={form.line1}
              onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setEditing(null);
                setForm(emptyForm());
              }}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold dark:border-zinc-600"
            >
              İptal
            </button>
          </div>
        </GlassCard>
      ) : null}

      {listQuery.isPending ? (
        <div className="flex justify-center rounded-xl border border-zinc-200/80 bg-white py-12 dark:border-white/10 dark:bg-zinc-900/50">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      ) : listQuery.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {(listQuery.error as Error).message}
        </p>
      ) : (listQuery.data?.items.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-zinc-200/80 bg-white px-4 py-8 text-center text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-400">
          Henüz kayıtlı adres yok.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-soft dark:border-white/10 dark:bg-zinc-900/50">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/90 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">İlçe</th>
                <th className="px-4 py-3">Mahalle</th>
                <th className="px-4 py-3">Adres</th>
                <th className="px-4 py-3">Teslimat Bölgesi</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
              {listQuery.data!.items.map((a) => (
                <tr key={a.id} className="hover:bg-brand/[0.03]">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{a.title}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {a.neighborhood?.district.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {a.neighborhood?.name ?? '—'}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-zinc-700 dark:text-zinc-300">{a.line1}</td>
                  <td className="px-4 py-3">
                    {a.serviceAvailable ? (
                      <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                        Aktif
                      </span>
                    ) : (
                      <span
                        className="inline-flex max-w-[200px] rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-100"
                        title={a.serviceUnavailableReason ?? undefined}
                      >
                        {a.serviceUnavailableReason ?? 'Hizmet dışı'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium hover:border-brand/30 dark:border-zinc-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Düzenle
                      </button>
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm('Bu adresi silmek istediğinize emin misiniz?')) {
                            deleteMutation.mutate(a.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:border-red-500/40 dark:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
