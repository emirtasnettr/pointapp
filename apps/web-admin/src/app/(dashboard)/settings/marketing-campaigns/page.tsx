'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { HtmlEditor } from '@/components/admin/HtmlEditor';
import { apiDelete, apiGet, apiPatch, apiPost, staffPostMultipart } from '@/lib/api';
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
  PHASE_LABEL,
  MARKETING_CAMPAIGN_COVER_RECOMMENDED_PX,
  STAFF_MARKETING_CAMPAIGNS_KEY,
  type StaffMarketingCampaign,
} from '@/lib/marketing-campaigns';
import { cn } from '@/lib/cn';

type ListResponse = { items: StaffMarketingCampaign[] };

const emptyForm = () => ({
  title: '',
  slug: '',
  summary: '',
  partnerLabel: '',
  contentHtml: '<p></p>',
  startsAt: isoToDatetimeLocal(new Date().toISOString()),
  endsAt: isoToDatetimeLocal(new Date(Date.now() + 30 * 86400000).toISOString()),
  published: true,
  sortOrder: '0',
});

function loadForm(c: StaffMarketingCampaign) {
  return {
    title: c.title,
    slug: c.slug,
    summary: c.summary,
    partnerLabel: c.partnerLabel ?? '',
    contentHtml: c.contentHtml || '<p></p>',
    startsAt: isoToDatetimeLocal(c.startsAt),
    endsAt: isoToDatetimeLocal(c.endsAt),
    published: c.published,
    sortOrder: String(c.sortOrder),
  };
}

export default function MarketingCampaignsSettingsPage() {
  const qc = useQueryClient();
  const imageRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const q = useQuery({
    queryKey: STAFF_MARKETING_CAMPAIGNS_KEY,
    queryFn: () => apiGet<ListResponse>('/staff/marketing-campaigns'),
    retry: 0,
  });

  const editing = q.data?.items.find((i) => i.id === editingId) ?? null;

  useEffect(() => {
    if (creating) {
      setForm(emptyForm());
      return;
    }
    if (editing) setForm(loadForm(editing));
  }, [creating, editing]);

  const saveM = useMutation({
    mutationFn: async () => {
      const body = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        summary: form.summary.trim(),
        partnerLabel: form.partnerLabel.trim() || null,
        contentHtml: form.contentHtml,
        startsAt: datetimeLocalToIso(form.startsAt),
        endsAt: datetimeLocalToIso(form.endsAt),
        published: form.published,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (creating) {
        return apiPost<StaffMarketingCampaign>('/staff/marketing-campaigns', body);
      }
      if (!editingId) throw new Error('Düzenlenecek kampanya seçilmedi');
      return apiPatch<StaffMarketingCampaign>(`/staff/marketing-campaigns/${editingId}`, body);
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: STAFF_MARKETING_CAMPAIGNS_KEY });
      setCreating(false);
      setEditingId(row.id);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/staff/marketing-campaigns/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: STAFF_MARKETING_CAMPAIGNS_KEY });
      setEditingId(null);
      setCreating(false);
    },
  });

  async function onImagePick(file: File | null | undefined) {
    const id = editingId;
    if (!file?.size || !id) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await staffPostMultipart<StaffMarketingCampaign>(
        `/staff/marketing-campaigns/${id}/image`,
        fd,
      );
      void qc.invalidateQueries({ queryKey: STAFF_MARKETING_CAMPAIGNS_KEY });
    } finally {
      setImageUploading(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  }

  if (q.isError) {
    const msg = (q.error as Error).message;
    const forbidden = msg.includes('403') || msg.toLowerCase().includes('forbidden');
    return (
      <>
        <PageHeader
          title="Tanıtım kampanyaları"
          description="Ana sitede yayınlanan kampanya ve iş ortaklığı içerikleri."
        />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {forbidden ? (
            <>Bu sayfayı yalnızca sistem yöneticisi yönetebilir.</>
          ) : (
            <>
              {msg}{' '}
              <Link href="/auth/login" className="font-medium text-brand hover:underline">
                Giriş
              </Link>
            </>
          )}
        </p>
      </>
    );
  }

  const showForm = creating || editingId != null;

  return (
    <>
      <PageHeader
        title="Tanıtım kampanyaları"
        description="Kampanyalar /kampanyalar sayfasında kart olarak listelenir; tıklanınca detay sayfası açılır. Süresi dolanlar sitede gri görünür."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <GlassCard className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Kampanyalar</h2>
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Yeni
            </button>
          </div>

          {q.isPending ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" aria-hidden />
            </div>
          ) : (
            <ul className="max-h-[min(70vh,640px)] space-y-1 overflow-y-auto">
              {(q.data?.items ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setEditingId(item.id);
                    }}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left text-sm transition',
                      editingId === item.id && !creating
                        ? 'border-brand/40 bg-brand/10'
                        : 'border-transparent hover:border-zinc-200 hover:bg-zinc-50',
                    )}
                  >
                    <span className="font-medium text-zinc-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {PHASE_LABEL[item.phase]}
                      {!item.published ? ' · Taslak' : ''}
                    </span>
                  </button>
                </li>
              ))}
              {!q.data?.items.length ? (
                <p className="px-2 py-4 text-xs text-zinc-500">Henüz kampanya yok.</p>
              ) : null}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="space-y-5 p-5">
          {!showForm ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              Soldan bir kampanya seçin veya yeni kampanya ekleyin.
            </p>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-zinc-900">
                {creating ? 'Yeni kampanya' : 'Kampanyayı düzenle'}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600">Başlık</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">URL slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="otomatik (başlıktan)"
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">Sıra (büyük önce)</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600">Kısa özet (kart)</label>
                  <textarea
                    value={form.summary}
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                    rows={2}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600">İş ortağı etiketi (isteğe bağlı)</label>
                  <input
                    value={form.partnerLabel}
                    onChange={(e) => setForm((f) => ({ ...f, partnerLabel: e.target.value }))}
                    placeholder="Örn. İş ortağı: XYZ Market"
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">Başlangıç</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600">Bitiş</label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="published"
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                    className="h-4 w-4 rounded border-zinc-300 text-brand"
                  />
                  <label htmlFor="published" className="text-sm text-zinc-700">
                    Yayında (işaret kaldırılırsa sitede gizlenir)
                  </label>
                </div>
              </div>

              {!creating && editing ? (
                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50 p-4">
                  <p className="text-xs font-medium text-zinc-600">Kapak görseli</p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    {editing.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editing.imageUrl} alt="" className="block max-h-48 w-full object-contain" />
                    ) : (
                      <p className="px-4 py-8 text-center text-xs text-zinc-500">Görsel yok</p>
                    )}
                  </div>
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => void onImagePick(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    disabled={imageUploading}
                    onClick={() => imageRef.current?.click()}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {imageUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Upload className="h-4 w-4" aria-hidden />
                    )}
                    Görsel yükle
                  </button>
                  <p className="mt-1 text-xs text-zinc-500">PNG, JPEG veya WebP; en fazla 5 MB.</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Tavsiye edilen görsel boyutu: {MARKETING_CAMPAIGN_COVER_RECOMMENDED_PX.width}×
                    {MARKETING_CAMPAIGN_COVER_RECOMMENDED_PX.height} px (16:9 yatay).
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Kapak görseli kampanya oluşturulduktan sonra yüklenebilir.</p>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-600">Detay içeriği (HTML)</label>
                <div className="mt-2">
                  <HtmlEditor
                    value={form.contentHtml}
                    onChange={(html) => setForm((f) => ({ ...f, contentHtml: html }))}
                    showPreview={false}
                  />
                </div>
              </div>

              {saveM.isError ? (
                <p className="text-sm text-red-700">{(saveM.error as Error).message}</p>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-zinc-200/80 pt-4">
                <button
                  type="button"
                  disabled={saveM.isPending}
                  onClick={() => void saveM.mutateAsync()}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saveM.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden />
                  )}
                  Kaydet
                </button>
                {!creating && editingId ? (
                  <button
                    type="button"
                    disabled={deleteM.isPending}
                    onClick={() => {
                      if (!window.confirm('Bu kampanya kalıcı olarak silinsin mi?')) return;
                      void deleteM.mutateAsync(editingId);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleteM.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                    Sil
                  </button>
                ) : null}
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </>
  );
}
