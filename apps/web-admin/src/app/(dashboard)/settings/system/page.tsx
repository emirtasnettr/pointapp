'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Upload } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiGet, apiPatch, staffPostMultipart } from '@/lib/api';
import { PUBLIC_BRAND_QUERY_KEY } from '@/lib/brand-public';
import { numSetting, strSetting, STAFF_SETTINGS_QUERY_KEY, type StaffSettingsResponse } from '@/lib/settings-api';
import { cn } from '@/lib/cn';

const HERO_SIZE_NOTE =
  'Hero alanı yatay düzen için uygundur. Önerilen en az 1200×800 px (veya benzer yatay oran); görsel object-contain ile sığdırılır.';

const SHOWCASE_SIZE_NOTE =
  'Müşteri tanıtım alanı telefon veya uygulama mockup’u için uygundur. Önerilen en az 800×900 px (dikey veya kare); görsel çerçeveyi dolduracak şekilde kırpılarak gösterilir.';

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Görsel okunamadı'));
    };
    img.src = url;
  });
}

export default function SystemSettingsPage() {
  const qc = useQueryClient();
  const heroFileRef = useRef<HTMLInputElement>(null);
  const showcaseFileRef = useRef<HTMLInputElement>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [showcaseUploading, setShowcaseUploading] = useState(false);
  const q = useQuery({
    queryKey: STAFF_SETTINGS_QUERY_KEY,
    queryFn: () => apiGet<StaffSettingsResponse>('/staff/settings'),
    retry: 0,
  });

  const [commissionPct, setCommissionPct] = useState('');
  const [nightStart, setNightStart] = useState('');
  const [nightEnd, setNightEnd] = useState('');
  const [supportLinePhone, setSupportLinePhone] = useState('');
  const [companyLegalTitle, setCompanyLegalTitle] = useState('');
  const [companyTaxNumber, setCompanyTaxNumber] = useState('');
  const [companyTaxOffice, setCompanyTaxOffice] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [heroW, setHeroW] = useState<number | null>(null);
  const [heroH, setHeroH] = useState<number | null>(null);
  const [pendingHeroDims, setPendingHeroDims] = useState<{ width: number; height: number } | null>(null);
  const [showcaseUrl, setShowcaseUrl] = useState('');
  const [showcaseW, setShowcaseW] = useState<number | null>(null);
  const [showcaseH, setShowcaseH] = useState<number | null>(null);
  const [pendingShowcaseDims, setPendingShowcaseDims] = useState<{ width: number; height: number } | null>(null);
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');

  useEffect(() => {
    if (!q.data?.values) return;
    const v = q.data.values;
    setCommissionPct(String(numSetting(v['system.commissionDefaultPct'], 45)));
    setNightStart(strSetting(v['system.nightTariffStart'], '22:00'));
    setNightEnd(strSetting(v['system.nightTariffEnd'], '06:00'));
    setSupportLinePhone(strSetting(v['system.supportLinePhone'], ''));
    setCompanyLegalTitle(strSetting(v['system.companyLegalTitle'], ''));
    setCompanyTaxNumber(strSetting(v['system.companyTaxNumber'], ''));
    setCompanyTaxOffice(strSetting(v['system.companyTaxOffice'], ''));
    setCompanyAddress(strSetting(v['system.companyAddress'], ''));
    setCompanyEmail(strSetting(v['system.companyEmail'], ''));
    setCompanyPhone(strSetting(v['system.companyPhone'], ''));
    setHeroUrl(strSetting(v['marketing.heroImageUrl'], ''));
    const w = numSetting(v['marketing.heroImageWidth'], 0);
    const h = numSetting(v['marketing.heroImageHeight'], 0);
    setHeroW(w > 0 ? w : null);
    setHeroH(h > 0 ? h : null);
    setShowcaseUrl(strSetting(v['marketing.customerShowcaseImageUrl'], ''));
    const sw = numSetting(v['marketing.customerShowcaseImageWidth'], 0);
    const sh = numSetting(v['marketing.customerShowcaseImageHeight'], 0);
    setShowcaseW(sw > 0 ? sw : null);
    setShowcaseH(sh > 0 ? sh : null);
    setAppStoreUrl(strSetting(v['marketing.appStoreUrl'], ''));
    setGooglePlayUrl(strSetting(v['marketing.googlePlayUrl'], ''));
  }, [q.data]);

  async function onHeroFilePick(file: File | null | undefined) {
    if (!file?.size) {
      setPendingHeroDims(null);
      return;
    }
    try {
      setPendingHeroDims(await readImageDimensions(file));
    } catch {
      setPendingHeroDims(null);
    }
    await uploadHero(file);
  }

  async function onShowcaseFilePick(file: File | null | undefined) {
    if (!file?.size) {
      setPendingShowcaseDims(null);
      return;
    }
    try {
      setPendingShowcaseDims(await readImageDimensions(file));
    } catch {
      setPendingShowcaseDims(null);
    }
    await uploadShowcase(file);
  }

  async function uploadShowcase(file: File | null | undefined) {
    if (!file?.size) return;
    setShowcaseUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await staffPostMultipart<StaffSettingsResponse>(
        '/staff/settings/marketing-customer-showcase',
        fd,
      );
      void qc.setQueryData(STAFF_SETTINGS_QUERY_KEY, data);
      void qc.invalidateQueries({ queryKey: PUBLIC_BRAND_QUERY_KEY });
      const v = data.values;
      setShowcaseUrl(strSetting(v['marketing.customerShowcaseImageUrl'], ''));
      const w = numSetting(v['marketing.customerShowcaseImageWidth'], 0);
      const h = numSetting(v['marketing.customerShowcaseImageHeight'], 0);
      setShowcaseW(w > 0 ? w : null);
      setShowcaseH(h > 0 ? h : null);
    } finally {
      setShowcaseUploading(false);
      setPendingShowcaseDims(null);
      if (showcaseFileRef.current) showcaseFileRef.current.value = '';
    }
  }

  async function uploadHero(file: File | null | undefined) {
    if (!file?.size) return;
    setHeroUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await staffPostMultipart<StaffSettingsResponse>('/staff/settings/marketing-hero', fd);
      void qc.setQueryData(STAFF_SETTINGS_QUERY_KEY, data);
      void qc.invalidateQueries({ queryKey: PUBLIC_BRAND_QUERY_KEY });
      const v = data.values;
      setHeroUrl(strSetting(v['marketing.heroImageUrl'], ''));
      const w = numSetting(v['marketing.heroImageWidth'], 0);
      const h = numSetting(v['marketing.heroImageHeight'], 0);
      setHeroW(w > 0 ? w : null);
      setHeroH(h > 0 ? h : null);
    } finally {
      setHeroUploading(false);
      setPendingHeroDims(null);
      if (heroFileRef.current) heroFileRef.current.value = '';
    }
  }

  const saveM = useMutation({
    mutationFn: async () => {
      const pct = Number(commissionPct);
      return apiPatch<StaffSettingsResponse>('/staff/settings', {
        values: {
          'system.commissionDefaultPct': pct,
          'system.nightTariffStart': nightStart.trim(),
          'system.nightTariffEnd': nightEnd.trim(),
          'system.supportLinePhone': supportLinePhone.trim(),
          'system.companyLegalTitle': companyLegalTitle.trim(),
          'system.companyTaxNumber': companyTaxNumber.trim(),
          'system.companyTaxOffice': companyTaxOffice.trim(),
          'system.companyAddress': companyAddress.trim(),
          'system.companyEmail': companyEmail.trim(),
          'system.companyPhone': companyPhone.trim(),
        },
      });
    },
    onSuccess: (data) => {
      void qc.setQueryData(STAFF_SETTINGS_QUERY_KEY, data);
    },
  });

  const saveMarketingM = useMutation({
    mutationFn: async () =>
      apiPatch<StaffSettingsResponse>('/staff/settings', {
        values: {
          'marketing.appStoreUrl': appStoreUrl.trim(),
          'marketing.googlePlayUrl': googlePlayUrl.trim(),
        },
      }),
    onSuccess: (data) => {
      void qc.setQueryData(STAFF_SETTINGS_QUERY_KEY, data);
      void qc.invalidateQueries({ queryKey: PUBLIC_BRAND_QUERY_KEY });
    },
  });

  if (q.isError) {
    const msg = (q.error as Error).message;
    const forbidden = msg.includes('403') || msg.toLowerCase().includes('forbidden');
    return (
      <>
        <PageHeader
          title="Sistem Ayarları"
          description="Komisyon, gece tarifesi, destek hattı ve Point vergi bilgileri — yalnızca sistem yöneticisi."
        />
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {forbidden ? (
            <>Bu sayfayı yalnızca sistem yöneticisi görüntüleyebilir. Demo giriş: yonetici@pointdelivery.com.tr</>
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

  return (
    <>
      <PageHeader
        title="Sistem Ayarları"
        description="Komisyon, gece tarifesi, kurye destek hattı ve fatura için Point vergi bilgileri."
      />
      {q.data?.updatedAt ? (
        <p className="mb-4 text-xs text-zinc-500">Son güncelleme: {new Date(q.data.updatedAt).toLocaleString('tr-TR')}</p>
      ) : null}
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-5 p-5">
        {q.isPending ? (
          <div className="flex justify-center py-8 text-zinc-500">
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-zinc-600">Varsayılan komisyon (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">0–100 arası tam sayı (ör. 45 = %45).</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-zinc-600">Gece tarifesi başlangıç (UTC SS:dd)</label>
                <input
                  value={nightStart}
                  onChange={(e) => setNightStart(e.target.value)}
                  placeholder="22:00"
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">Gece tarifesi bitiş (UTC SS:dd)</label>
                <input
                  value={nightEnd}
                  onChange={(e) => setNightEnd(e.target.value)}
                  placeholder="06:00"
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Destek hattı (kurye uygulaması)</label>
              <input
                value={supportLinePhone}
                onChange={(e) => setSupportLinePhone(e.target.value)}
                placeholder="+90 850 000 00 00"
                inputMode="tel"
                autoComplete="tel"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Kurye müşteri numaralarını görmez; teslimat detayında yalnızca bu numarayı arayabilir.
              </p>
            </div>

            <div className="border-t border-zinc-200/80 pt-5">
              <h2 className="text-sm font-semibold text-zinc-900">Point vergi bilgileri</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Kurye uygulamasında «Point Vergi Bilgileri» ekranında gösterilir; fatura keserken kopyalanır.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Firma ünvan bilgisi</label>
              <input
                value={companyLegalTitle}
                onChange={(e) => setCompanyLegalTitle(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-zinc-600">Vergi K.No</label>
                <input
                  value={companyTaxNumber}
                  onChange={(e) => setCompanyTaxNumber(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">Vergi dairesi</label>
                <input
                  value={companyTaxOffice}
                  onChange={(e) => setCompanyTaxOffice(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Firma adresi</label>
              <textarea
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-zinc-600">Firma maili</label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">Firma telefon numarası</label>
                <input
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  inputMode="tel"
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
            </div>

            {saveM.isError ? (
              <p className="text-sm text-red-700">{(saveM.error as Error).message}</p>
            ) : null}
            <button
              type="button"
              disabled={saveM.isPending}
              onClick={() => void saveM.mutateAsync()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Kaydet
            </button>
          </>
        )}
        </GlassCard>

        <GlassCard className="space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Tanıtım sitesi — hero görseli</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Ana sayfa hero alanında gösterilir. PNG, JPEG veya WebP; en fazla 5 MB.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-600">
            <p className="font-medium text-zinc-800">Not — önerilen boyut</p>
            <p className="mt-1">{HERO_SIZE_NOTE}</p>
          </div>

          {q.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" aria-hidden />
          ) : (
            <>
              {heroW && heroH ? (
                <div className="rounded-lg border border-brand/25 bg-brand/5 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                    Hero’da yayınlanan görsel boyutu
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-900">
                    {heroW} × {heroH} px
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Bu ölçüler yükleme sonrası otomatik kaydedilir; ana sayfada aynı bilgi görünür.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-500">
                  Henüz hero görseli yok. Yükledikten sonra piksel boyutu burada not olarak görünür.
                </p>
              )}

              {pendingHeroDims ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                    Seçilen dosya boyutu
                  </p>
                  <p className="mt-1 font-mono text-base font-semibold tabular-nums text-amber-950">
                    {pendingHeroDims.width} × {pendingHeroDims.height} px
                  </p>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50">
                {heroUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroUrl} alt="" className="block max-h-64 w-full object-contain" />
                ) : (
                  <p className="px-4 py-10 text-center text-sm text-zinc-500">Önizleme — henüz görsel yok</p>
                )}
              </div>
              <input
                ref={heroFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => void onHeroFilePick(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={heroUploading}
                onClick={() => heroFileRef.current?.click()}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50',
                )}
              >
                {heroUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden />
                )}
                Görsel yükle veya değiştir
              </button>
            </>
          )}
        </GlassCard>
      </div>

      <GlassCard className="mt-6 max-w-5xl space-y-5 p-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Tanıtım sitesi — müşteri tanıtım alanı</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Ana sayfada «Müşteriler için» bölümünde sağ tarafta gösterilir. PNG, JPEG veya WebP; en fazla 5 MB.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-600">
          <p className="font-medium text-zinc-800">Not — önerilen boyut</p>
          <p className="mt-1">{SHOWCASE_SIZE_NOTE}</p>
        </div>

        {q.isPending ? (
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" aria-hidden />
        ) : (
          <>
            {showcaseW && showcaseH ? (
              <div className="rounded-lg border border-brand/25 bg-brand/5 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">Yayınlanan görsel boyutu</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-900">
                  {showcaseW} × {showcaseH} px
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-500">
                Henüz görsel yok. Yükledikten sonra piksel boyutu burada görünür.
              </p>
            )}

            {pendingShowcaseDims ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">Seçilen dosya boyutu</p>
                <p className="mt-1 font-mono text-base font-semibold tabular-nums text-amber-950">
                  {pendingShowcaseDims.width} × {pendingShowcaseDims.height} px
                </p>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50">
              {showcaseUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={showcaseUrl} alt="" className="block max-h-72 w-full object-contain" />
              ) : (
                <p className="px-4 py-10 text-center text-sm text-zinc-500">Önizleme — henüz görsel yok</p>
              )}
            </div>
            <input
              ref={showcaseFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void onShowcaseFilePick(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={showcaseUploading}
              onClick={() => showcaseFileRef.current?.click()}
              className={cn(
                'inline-flex w-full max-w-md items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50',
              )}
            >
              {showcaseUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
              Görsel yükle veya değiştir
            </button>

            <div className="border-t border-zinc-200/80 pt-5">
              <h3 className="text-sm font-semibold text-zinc-900">Mağaza bağlantıları</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Ana sayfada App Store ve Google Play rozetleri; boş bırakılan mağaza gizlenir.
              </p>
            </div>
            <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-zinc-600">App Store URL</label>
                <input
                  value={appStoreUrl}
                  onChange={(e) => setAppStoreUrl(e.target.value)}
                  placeholder="https://apps.apple.com/..."
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">Google Play URL</label>
                <input
                  value={googlePlayUrl}
                  onChange={(e) => setGooglePlayUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/..."
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </div>
            </div>
            {saveMarketingM.isError ? (
              <p className="text-sm text-red-700">{(saveMarketingM.error as Error).message}</p>
            ) : null}
            <button
              type="button"
              disabled={saveMarketingM.isPending}
              onClick={() => void saveMarketingM.mutateAsync()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveMarketingM.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Mağaza linklerini kaydet
            </button>
          </>
        )}
      </GlassCard>
    </>
  );
}
