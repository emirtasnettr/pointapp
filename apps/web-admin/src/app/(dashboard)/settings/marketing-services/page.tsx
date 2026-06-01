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
  MARKETING_SERVICE_ICON_PX,
  STAFF_MARKETING_SERVICES_KEY,
  type StaffMarketingService,
} from '@/lib/marketing-services';
import { cn } from '@/lib/cn';

type ListResponse = { items: StaffMarketingService[] };

const emptyForm = () => ({
  title: '',
  slug: '',
  summary: '',
  heroTitle: '',
  heroTitleAccent: '',
  heroDescription: '',
  contentHtml: '<p></p>',
  published: true,
  sortOrder: '0',
});

function validateMarketingServiceForm(form: ReturnType<typeof emptyForm>): string | null {
  if (!form.title.trim()) return 'Kart başlığı gerekli.';
  if (!form.summary.trim()) return 'Kısa özet gerekli.';
  if (!form.heroTitle.trim()) return 'Hero başlık gerekli.';
  if (!form.heroDescription.trim()) return 'Hero açıklama gerekli.';
  if (form.heroTitle.length > 240) return 'Hero başlık en fazla 240 karakter olabilir.';
  if (form.heroTitleAccent.length > 240) return 'Vurgulu ifade en fazla 240 karakter olabilir.';
  if (form.heroDescription.length > 800) return 'Hero açıklama en fazla 800 karakter olabilir.';
  const accent = form.heroTitleAccent.trim();
  if (accent && !form.heroTitle.includes(accent)) {
    return 'Vurgulu ifade, hero başlık metninin içinde geçmelidir.';
  }
  return null;
}

function loadForm(s: StaffMarketingService) {
  return {
    title: s.title,
    slug: s.slug,
    summary: s.summary,
    heroTitle: s.heroTitle,
    heroTitleAccent: s.heroTitleAccent ?? '',
    heroDescription: s.heroDescription,
    contentHtml: s.contentHtml || '<p></p>',
    published: s.published,
    sortOrder: String(s.sortOrder),
  };
}

export default function MarketingServicesSettingsPage() {
  const qc = useQueryClient();
  const iconRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const q = useQuery({
    queryKey: STAFF_MARKETING_SERVICES_KEY,
    queryFn: () => apiGet<ListResponse>('/staff/marketing-services'),
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
      const validationError = validateMarketingServiceForm(form);
      if (validationError) throw new Error(validationError);

      const body = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        summary: form.summary.trim(),
        heroTitle: form.heroTitle.trim(),
        heroTitleAccent: form.heroTitleAccent.trim() || null,
        heroDescription: form.heroDescription.trim(),
        contentHtml: form.contentHtml,
        published: form.published,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (creating) {
        return apiPost<StaffMarketingService>('/staff/marketing-services', body);
      }
      if (!editingId) throw new Error('Düzenlenecek hizmet seçilmedi');
      return apiPatch<StaffMarketingService>(`/staff/marketing-services/${editingId}`, body);
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: STAFF_MARKETING_SERVICES_KEY });
      setCreating(false);
      setEditingId(row.id);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/staff/marketing-services/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: STAFF_MARKETING_SERVICES_KEY });
      setEditingId(null);
      setCreating(false);
    },
  });

  async function onIconPick(file: File | null | undefined) {
    const id = editingId;
    if (!file?.size || !id) return;
    setIconUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await staffPostMultipart<StaffMarketingService>(`/staff/marketing-services/${id}/icon`, fd);
      void qc.invalidateQueries({ queryKey: STAFF_MARKETING_SERVICES_KEY });
    } finally {
      setIconUploading(false);
      if (iconRef.current) iconRef.current.value = '';
    }
  }

  if (q.isError) {
    const msg = (q.error as Error).message;
    const forbidden = msg.includes('403') || msg.toLowerCase().includes('forbidden');
    return (
      <>
        <PageHeader
          title="Tanıtım hizmetleri"
          description="Ana sitede /hizmetler sayfasında kart olarak listelenir; detayda yeşil hero alanı gösterilir."
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
        title="Tanıtım hizmetleri"
        description="Hizmetler /hizmetler sayfasında kart olarak listelenir. Kartta 200×200 PNG ikon; detayda hero başlık ve açıklama (ana sayfa hero gibi) kullanılır."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <GlassCard className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Hizmetler</h2>
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
                      /hizmetler/{item.slug}
                      {!item.published ? ' · Taslak' : ''}
                    </span>
                  </button>
                </li>
              ))}
              {!q.data?.items.length ? (
                <p className="px-2 py-4 text-xs text-zinc-500">Henüz hizmet yok.</p>
              ) : null}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="space-y-5 p-5">
          {!showForm ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              Soldan bir hizmet seçin veya yeni hizmet ekleyin.
            </p>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-zinc-900">
                {creating ? 'Yeni hizmet' : 'Hizmeti düzenle'}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-zinc-600">Kart başlığı</label>
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
                  <p className="mt-1 text-xs text-zinc-500">Kartta görünür; boş bırakılamaz.</p>
                </div>
              </div>

              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                <p className="text-xs font-semibold text-zinc-800">Detay sayfası — yeşil hero</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Ana sayfadaki hero gibi görünür. Vurgulu ifade, hero başlığı içinde geçtiği yerde açık yeşil
                  renkle gösterilir.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">Hero başlık (H1)</label>
                    <input
                      value={form.heroTitle}
                      maxLength={240}
                      onChange={(e) => setForm((f) => ({ ...f, heroTitle: e.target.value }))}
                      placeholder="Gönderileriniz saatler içerisinde, doğru kurye ile teslim edilsin."
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-zinc-500">{form.heroTitle.length}/240</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">
                      Vurgulu ifade (isteğe bağlı)
                    </label>
                    <input
                      value={form.heroTitleAccent}
                      maxLength={240}
                      onChange={(e) => setForm((f) => ({ ...f, heroTitleAccent: e.target.value }))}
                      placeholder="Örn. doğru kurye ile"
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Başlıkta vurgulanacak kısım · {form.heroTitleAccent.length}/240
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">Hero açıklama</label>
                    <textarea
                      value={form.heroDescription}
                      maxLength={800}
                      onChange={(e) => setForm((f) => ({ ...f, heroDescription: e.target.value }))}
                      rows={3}
                      placeholder="Point; evrak, paket ve acil gönderiler için…"
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-zinc-500">Yeşil hero bandının altındaki paragraf; boş bırakılamaz.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="svc-published"
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 text-brand"
                />
                <label htmlFor="svc-published" className="text-sm text-zinc-700">
                  Yayında (işaret kaldırılırsa sitede gizlenir)
                </label>
              </div>

              {!creating && editing ? (
                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50 p-4">
                  <p className="text-xs font-medium text-zinc-600">
                    Kart ikonu ({MARKETING_SERVICE_ICON_PX}×{MARKETING_SERVICE_ICON_PX} PNG)
                  </p>
                  <div className="mt-3 flex justify-center rounded-lg border border-zinc-200 bg-white p-4">
                    {editing.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editing.iconUrl}
                        alt=""
                        width={MARKETING_SERVICE_ICON_PX}
                        height={MARKETING_SERVICE_ICON_PX}
                        className="h-[200px] w-[200px] object-contain"
                      />
                    ) : (
                      <p className="py-16 text-center text-xs text-zinc-500">İkon yok</p>
                    )}
                  </div>
                  <input
                    ref={iconRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(e) => void onIconPick(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    disabled={iconUploading}
                    onClick={() => iconRef.current?.click()}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {iconUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Upload className="h-4 w-4" aria-hidden />
                    )}
                    İkon yükle
                  </button>
                  <p className="mt-1 text-xs text-zinc-500">
                    Yalnızca PNG; tam {MARKETING_SERVICE_ICON_PX}×{MARKETING_SERVICE_ICON_PX} piksel; en fazla 2
                    MB.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">İkon, hizmet oluşturulduktan sonra yüklenebilir.</p>
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
                      if (!window.confirm('Bu hizmet kalıcı olarak silinsin mi?')) return;
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
