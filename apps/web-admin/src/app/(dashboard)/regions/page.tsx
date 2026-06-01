'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Percent, RefreshCw, Route, X } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiBase, apiGet, apiPatch, apiTimeoutSignal } from '@/lib/api';
import { formatTry } from '@/lib/format';
import { cn } from '@/lib/cn';

type RegionRow = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  districtCount: number;
  neighborhoodCount: number;
};

type DistrictRow = {
  id: string;
  name: string;
  regionId: string;
  active: boolean;
  pricingRegionId: string;
  pricingRegion: { id: string; code: string; name: string; sortOrder: number };
};

type PricingZoneRow = { id: string; code: string; name: string; sortOrder: number };

type NeighborhoodRow = { id: string; name: string; districtId: string; extraFee: string; active: boolean };

type MatrixResponse = {
  items: Array<{
    id: string;
    fromRegion: { id: string; code: string; name: string; sortOrder: number };
    toRegion: { id: string; code: string; name: string; sortOrder: number };
    baseMotor: string;
    baseCar: string;
    perKgMotor: string;
    perKgCar: string;
    nightMultiplier: string;
    surgeMultiplier: string;
    effectiveFrom: string;
  }>;
};

async function geoGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    cache: 'no-store',
    signal: apiTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

type MatrixCell = MatrixResponse['items'][number];

function buildMatrixGrid(items: MatrixCell[]) {
  if (!items.length) {
    return {
      axis: [] as Array<{ id: string; code: string; name: string; sortOrder: number }>,
      cells: new Map<string, Map<string, MatrixCell>>(),
    };
  }
  const regionMap = new Map<string, { id: string; code: string; name: string; sortOrder: number }>();
  for (const m of items) {
    regionMap.set(m.fromRegion.id, m.fromRegion);
    regionMap.set(m.toRegion.id, m.toRegion);
  }
  const axis = Array.from(regionMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
  );
  const cells = new Map<string, Map<string, MatrixCell>>();
  for (const m of items) {
    if (!cells.has(m.fromRegion.id)) cells.set(m.fromRegion.id, new Map());
    cells.get(m.fromRegion.id)!.set(m.toRegion.id, m);
  }
  return { axis, cells };
}

type MatrixForm = {
  baseMotor: string;
  baseCar: string;
  perKgMotor: string;
  perKgCar: string;
  nightMultiplier: string;
  surgeMultiplier: string;
};

export default function RegionsPage() {
  const qc = useQueryClient();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [editCell, setEditCell] = useState<MatrixCell | null>(null);
  const [mf, setMf] = useState<MatrixForm>({
    baseMotor: '',
    baseCar: '',
    perKgMotor: '',
    perKgCar: '',
    nightMultiplier: '',
    surgeMultiplier: '',
  });
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({});
  const [bulkPercent, setBulkPercent] = useState('');

  const regionsQ = useQuery({
    queryKey: ['geography', 'regions'],
    queryFn: () => geoGet<RegionRow[]>('/geography/regions'),
    retry: 1,
  });

  const regions = regionsQ.data ?? [];
  const activeRegionId = selectedRegionId ?? regions[0]?.id ?? null;

  useEffect(() => {
    const first = regionsQ.data?.[0]?.id;
    if (!selectedRegionId && first) {
      setSelectedRegionId(first);
    }
  }, [regionsQ.data, selectedRegionId]);

  useEffect(() => {
    setSelectedDistrictId(null);
  }, [activeRegionId]);

  const districtsQ = useQuery({
    queryKey: ['staff-geography', 'districts', activeRegionId],
    queryFn: () =>
      apiGet<DistrictRow[]>(`/staff/geography/districts?regionId=${encodeURIComponent(activeRegionId!)}`),
    enabled: !!activeRegionId,
    retry: 1,
  });

  const pricingZonesQ = useQuery({
    queryKey: ['geography', 'pricing-zones'],
    queryFn: () => geoGet<PricingZoneRow[]>('/geography/pricing-zones'),
    staleTime: 60_000,
    retry: 1,
  });

  const districts = districtsQ.data ?? [];
  const pricingZones = pricingZonesQ.data ?? [];

  const selectedDistrict = useMemo(
    () => districts.find((d) => d.id === selectedDistrictId),
    [districts, selectedDistrictId],
  );

  const neighborhoodsQ = useQuery({
    queryKey: ['staff-geography', 'neighborhoods', selectedDistrictId],
    queryFn: () =>
      apiGet<NeighborhoodRow[]>(
        `/staff/geography/neighborhoods?districtId=${encodeURIComponent(selectedDistrictId!)}`,
      ),
    enabled: !!selectedDistrictId,
    retry: 1,
  });

  const neighborhoodsRows = useMemo(() => {
    const rows = neighborhoodsQ.data ?? [];
    if (!selectedDistrictId) return [];
    return rows.filter((n) => n.districtId === selectedDistrictId);
  }, [neighborhoodsQ.data, selectedDistrictId]);

  useEffect(() => {
    setFeeDrafts(Object.fromEntries(neighborhoodsRows.map((n) => [n.id, n.extraFee])));
  }, [selectedDistrictId, neighborhoodsRows]);

  const matrixQ = useQuery({
    queryKey: ['geography', 'price-matrix'],
    queryFn: () => geoGet<MatrixResponse>('/geography/price-matrix'),
    retry: 1,
  });

  const matrixRows = matrixQ.data?.items ?? [];

  const matrixGrid = useMemo(() => buildMatrixGrid(matrixRows), [matrixRows]);

  useEffect(() => {
    if (!editCell) return;
    setMf({
      baseMotor: editCell.baseMotor,
      baseCar: editCell.baseCar,
      perKgMotor: editCell.perKgMotor,
      perKgCar: editCell.perKgCar,
      nightMultiplier: editCell.nightMultiplier,
      surgeMultiplier: editCell.surgeMultiplier,
    });
  }, [editCell]);

  const bulkAdjustMutation = useMutation({
    mutationFn: async (percent: number) => {
      return apiPatch<{ adjustedCount: number; percent: number; matrix: MatrixResponse }>(
        '/staff/geography/price-matrix/bulk-percent',
        { percent },
      );
    },
    onSuccess: (data) => {
      qc.setQueryData(['geography', 'price-matrix'], data.matrix);
      setBulkPercent('');
    },
  });

  const reviseMutation = useMutation({
    mutationFn: async () => {
      if (!editCell) throw new Error('Seçim yok');
      return apiPatch<MatrixResponse>('/staff/geography/price-matrix', {
        fromRegionId: editCell.fromRegion.id,
        toRegionId: editCell.toRegion.id,
        baseMotor: mf.baseMotor.trim(),
        baseCar: mf.baseCar.trim(),
        perKgMotor: mf.perKgMotor.trim(),
        perKgCar: mf.perKgCar.trim(),
        nightMultiplier: mf.nightMultiplier.trim(),
        surgeMultiplier: mf.surgeMultiplier.trim(),
      });
    },
    onSuccess: (data) => {
      qc.setQueryData(['geography', 'price-matrix'], data);
      setEditCell(null);
    },
  });

  const patchDistrictM = useMutation({
    mutationFn: (p: { id: string; active?: boolean; pricingRegionId?: string }) => {
      const body: { active?: boolean; pricingRegionId?: string } = {};
      if (p.active !== undefined) body.active = p.active;
      if (p.pricingRegionId !== undefined) body.pricingRegionId = p.pricingRegionId;
      return apiPatch<DistrictRow>(`/staff/geography/districts/${encodeURIComponent(p.id)}`, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-geography', 'districts', activeRegionId] });
      void qc.invalidateQueries({ queryKey: ['geography', 'regions'] });
    },
  });

  const patchNeighborhoodM = useMutation({
    mutationFn: (p: { id: string; active?: boolean; extraFee?: string }) => {
      const body: { active?: boolean; extraFee?: string } = {};
      if (p.active !== undefined) body.active = p.active;
      if (p.extraFee !== undefined) body.extraFee = p.extraFee;
      return apiPatch<NeighborhoodRow>(`/staff/geography/neighborhoods/${encodeURIComponent(p.id)}`, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-geography', 'neighborhoods', selectedDistrictId] });
      void qc.invalidateQueries({ queryKey: ['geography', 'regions'] });
    },
  });

  const err = (regionsQ.error ??
    districtsQ.error ??
    pricingZonesQ.error ??
    neighborhoodsQ.error ??
    matrixQ.error ??
    patchDistrictM.error ??
    patchNeighborhoodM.error) as Error | undefined;

  const refetchAll = () => {
    void regionsQ.refetch();
    void districtsQ.refetch();
    void pricingZonesQ.refetch();
    void neighborhoodsQ.refetch();
    void matrixQ.refetch();
  };

  const activeRegion = useMemo(() => regions.find((r) => r.id === activeRegionId), [regions, activeRegionId]);

  return (
    <>
      <PageHeader
        title="Bölge / fiyat matrisi"
        description="İstanbul ilçe ve mahalleleri: pasif alanlar müşteri tarafında listelenmez; mahalle ek ücreti ve pasif/aktif buradan yönetilir. Her ilçe fiyat matrisindeki bir PZ bölgesine atanır (değiştirilebilir)."
        actions={
          <button
            type="button"
            onClick={() => refetchAll()}
            disabled={
              regionsQ.isFetching ||
              districtsQ.isFetching ||
              pricingZonesQ.isFetching ||
              neighborhoodsQ.isFetching ||
              matrixQ.isFetching
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand/30 disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5 text-brand',
                (regionsQ.isFetching ||
                  districtsQ.isFetching ||
                  pricingZonesQ.isFetching ||
                  neighborhoodsQ.isFetching ||
                  matrixQ.isFetching) &&
                  'animate-spin',
              )}
              aria-hidden
            />
            Yenile
          </button>
        }
      />

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err.message}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <MapPin className="h-4 w-4 text-brand" aria-hidden />
            Bölge
          </div>
          {regionsQ.isPending ? (
            <div className="mt-8 flex justify-center text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
            </div>
          ) : regions.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Kayıtlı bölge yok.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {regions.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRegionId(r.id)}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      r.id === activeRegionId
                        ? 'border-brand/40 bg-brand/5 ring-1 ring-brand/20'
                        : 'border-zinc-200/90 bg-zinc-50/80 hover:border-brand/25',
                    )}
                  >
                    <span className="font-medium text-zinc-900">{r.name}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-zinc-400">{r.code}</span>
                    <span className="mt-2 block text-[11px] text-zinc-500">
                      {r.districtCount} ilçe · {r.neighborhoodCount} mahalle
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">İlçeler</h2>
            {activeRegion ? (
              <span className="text-[11px] text-zinc-500">
                {activeRegion.name} — {districts.length} ilçe
              </span>
            ) : null}
          </div>
          {!activeRegionId ? (
            <p className="mt-4 text-sm text-zinc-500">Önce bir bölge yüklenmeli.</p>
          ) : districtsQ.isPending ? (
            <div className="mt-8 flex justify-center text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
            </div>
          ) : (
            <div className="mt-4 max-h-[min(420px,50vh)] overflow-y-auto rounded-xl border border-zinc-200/80 bg-white/60">
              <ul className="divide-y divide-zinc-100">
                {districts.map((d) => (
                  <li key={d.id} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => setSelectedDistrictId(d.id)}
                      className={cn(
                        'min-w-0 flex-1 px-4 py-2.5 text-left text-sm transition-colors',
                        d.id === selectedDistrictId ? 'bg-brand/10 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50',
                        !d.active && 'opacity-70',
                      )}
                    >
                      <span className="font-medium">{d.name}</span>
                      {!d.active ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          Pasif
                        </span>
                      ) : null}
                      <span className="mt-0.5 block text-[10px] font-medium text-brand">Mahalleler →</span>
                    </button>
                    <div
                      className="flex shrink-0 flex-col justify-center gap-0.5 border-l border-zinc-100 bg-zinc-50/40 px-2 py-1.5"
                      onClick={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                        Fiyat bölgesi
                      </span>
                      <select
                        className="max-w-[6.5rem] rounded border border-zinc-200 bg-white px-1 py-1 font-mono text-[10px] font-semibold text-brand outline-none focus:border-brand/40 sm:max-w-[8rem]"
                        value={d.pricingRegionId}
                        disabled={
                          patchDistrictM.isPending || pricingZonesQ.isPending || pricingZones.length === 0
                        }
                        aria-label={`${d.name} fiyat bölgesi`}
                        onChange={(e) => {
                          const pricingRegionId = e.target.value;
                          if (pricingRegionId && pricingRegionId !== d.pricingRegionId) {
                            patchDistrictM.mutate({ id: d.id, pricingRegionId });
                          }
                        }}
                      >
                        {pricingZones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.code.replace(/^IST-/, '')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        patchDistrictM.mutate({ id: d.id, active: !d.active });
                      }}
                      disabled={patchDistrictM.isPending}
                      className="shrink-0 border-l border-zinc-100 px-3 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      {d.active ? 'Pasife al' : 'Aktifleştir'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Mahalleler{selectedDistrict ? <span className="normal-case text-zinc-700"> · {selectedDistrict.name}</span> : null}
            </h3>
            {!selectedDistrictId ? (
              <p className="mt-2 text-xs text-zinc-500">Soldan bir ilçe seçin.</p>
            ) : neighborhoodsQ.isPending ? (
              <div className="mt-4 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
              </div>
            ) : neighborhoodsRows.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">Bu ilçe için mahalle listesi yok veya yüklenemedi.</p>
            ) : (
              <div className="mt-2 max-h-[min(560px,55vh)] overflow-y-auto rounded-lg border border-zinc-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-zinc-50 text-[10px] font-semibold uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Mahalle</th>
                      <th className="px-3 py-2 text-right">Ek ücret (₺)</th>
                      <th className="px-3 py-2">Durum</th>
                      <th className="px-2 py-2 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-700">
                    {neighborhoodsRows.map((n) => {
                      const draft = feeDrafts[n.id] ?? n.extraFee;
                      const unchanged = draft.trim().replace(',', '.') === n.extraFee;
                      return (
                        <tr key={n.id} className={cn(!n.active && 'bg-amber-50/60')}>
                          <td className="px-3 py-2 font-medium">{n.name}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1">
                              <input
                                value={draft}
                                onChange={(e) => setFeeDrafts((s) => ({ ...s, [n.id]: e.target.value }))}
                                className="w-[4.5rem] rounded border border-zinc-200 px-1.5 py-1 font-mono text-[11px] outline-none focus:border-brand/40"
                                inputMode="decimal"
                                aria-label={`${n.name} ek ücret`}
                              />
                              <button
                                type="button"
                                disabled={patchNeighborhoodM.isPending || unchanged}
                                onClick={() => {
                                  const v = draft.trim().replace(',', '.');
                                  patchNeighborhoodM.mutate({ id: n.id, extraFee: v });
                                }}
                                className="rounded border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:border-brand/30 disabled:opacity-40"
                              >
                                Kaydet
                              </button>
                              <span className="hidden text-[10px] text-zinc-400 sm:inline tabular-nums">
                                ({formatTry(n.extraFee)})
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {n.active ? (
                              <span className="text-zinc-500">Aktif</span>
                            ) : (
                              <span className="font-semibold text-amber-800">Pasif</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              disabled={patchNeighborhoodM.isPending}
                              onClick={() => patchNeighborhoodM.mutate({ id: n.id, active: !n.active })}
                              className="text-[10px] font-semibold text-brand hover:underline disabled:opacity-40"
                            >
                              {n.active ? 'Pasife al' : 'Aktifleştir'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Route className="h-4 w-4 text-brand" aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-900">Fiyat matrisi</h2>
          <span className="text-[11px] text-zinc-500">(aktif satırlar; düzenleme yeni versiyon açar)</span>
        </div>
        {matrixQ.isPending ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
          </div>
        ) : matrixRows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Veritabanında aktif matris satırı yok. <code className="font-mono text-[11px]">npx prisma db seed</code> ile
            örnek bölgeler ve matris yüklenebilir.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-4">
              <div className="flex min-w-[10rem] flex-1 flex-col gap-1 sm:max-w-[12rem]">
                <label htmlFor="bulk-percent" className="text-xs font-semibold text-zinc-700">
                  Toplu zam / indirim (%)
                </label>
                <div className="relative">
                  <Percent className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                  <input
                    id="bulk-percent"
                    type="number"
                    step="0.1"
                    placeholder="örn. 10 veya -5"
                    value={bulkPercent}
                    onChange={(e) => setBulkPercent(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-2 font-mono text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={bulkAdjustMutation.isPending || !bulkPercent.trim()}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
                onClick={() => {
                  const pct = Number.parseFloat(bulkPercent.replace(',', '.'));
                  if (!Number.isFinite(pct) || pct === 0) {
                    window.alert('Geçerli bir yüzde girin (0 dışında). Pozitif zam, negatif indirim.');
                    return;
                  }
                  if (pct < -90 || pct > 500) {
                    window.alert('Yüzde -90 ile 500 arasında olmalıdır.');
                    return;
                  }
                  const label = pct > 0 ? `%${pct} zam` : `%${Math.abs(pct)} indirim`;
                  const ok = window.confirm(
                    `${matrixRows.length} aktif hücreye ${label} uygulanacak. Motor/araç baz, kg ücretleri ve çarpanlar güncellenir; eski satırlar kapanır. Devam?`,
                  );
                  if (!ok) return;
                  bulkAdjustMutation.mutate(pct);
                }}
              >
                {bulkAdjustMutation.isPending ? 'Uygulanıyor…' : 'Tüm matrise uygula'}
              </button>
              {bulkAdjustMutation.isError ? (
                <p className="w-full text-xs text-red-700">
                  {(bulkAdjustMutation.error as Error).message}
                </p>
              ) : null}
              <p className="w-full text-[11px] text-zinc-500">
                Pozitif değer zam, negatif indirim. Yalnızca güncel (aktif) hücreler; geçmiş siparişler etkilenmez.
              </p>
            </div>
            <p className="text-[11px] text-zinc-500">
              Satırlar <span className="font-medium text-zinc-700">kaynak</span>, sütunlar{' '}
              <span className="font-medium text-zinc-700">hedef</span> bölge. Hücreye tıklayarak düzenleyin; önceki satır
              kapanır, <span className="font-medium text-zinc-700">yeni teslimat talepleri</span> güncel fiyatı kullanır.
              Havuzdaki veya geçmişteki siparişlerin kayıtlı tutarı değişmez.
            </p>
            <div className="max-h-[min(70vh,720px)] overflow-auto rounded-xl border border-zinc-200/90 shadow-sm">
              <table className="min-w-max border-collapse text-xs">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 top-0 z-30 min-w-[7.5rem] border-b border-r border-zinc-200 bg-zinc-100 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      Kaynak → Hedef
                    </th>
                    {matrixGrid.axis.map((c) => (
                      <th
                        key={c.id}
                        scope="col"
                        title={c.name}
                        className="sticky top-0 z-20 min-w-[4.25rem] border-b border-l border-zinc-200 bg-zinc-50 px-1 py-2 text-center align-bottom text-[10px] font-semibold leading-tight text-zinc-600"
                      >
                        <span className="inline-block max-w-[4rem] hyphens-auto break-words font-mono text-[9px] text-brand">
                          {c.code.replace(/^IST-/, '')}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixGrid.axis.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/50">
                      <th
                        scope="row"
                        title={row.name}
                        className="sticky left-0 z-10 border-b border-r border-zinc-200 bg-white px-2 py-1.5 text-left text-[10px] font-semibold leading-snug text-zinc-700 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]"
                      >
                        <span className="font-mono text-[9px] text-brand">{row.code.replace(/^IST-/, '')}</span>
                        <span className="mt-0.5 block line-clamp-2 font-normal text-zinc-500">{row.name}</span>
                      </th>
                      {matrixGrid.axis.map((col) => {
                        const cell = matrixGrid.cells.get(row.id)?.get(col.id);
                        const same = row.id === col.id;
                        return (
                          <td
                            key={col.id}
                            className={cn(
                              'border-b border-l border-zinc-100 px-1 py-1.5 text-center align-middle tabular-nums',
                              same && 'bg-brand/[0.06]',
                              !cell && 'bg-zinc-50/80 text-zinc-300',
                            )}
                          >
                            {cell ? (
                              <button
                                type="button"
                                onClick={() => setEditCell(cell)}
                                className="flex w-full min-h-[2.75rem] flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-1 leading-tight transition-colors hover:bg-brand/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                                title={`Düzenle · kg motor: ${cell.perKgMotor} · kg araç: ${cell.perKgCar} · gece: ${cell.nightMultiplier} · dalgalanma: ${cell.surgeMultiplier}`}
                              >
                                <span className="font-medium text-zinc-900">{formatTry(cell.baseMotor)}</span>
                                <span className="text-[10px] text-zinc-500">{formatTry(cell.baseCar)}</span>
                              </button>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </GlassCard>

      {editCell ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setEditCell(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="matrix-edit-title"
            className="w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 id="matrix-edit-title" className="text-sm font-semibold text-zinc-900">
                  Fiyat hücresi
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {editCell.fromRegion.code} → {editCell.toRegion.code} · Eski satır kapanır, yeni talepler bu değerleri
                  görür.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditCell(null)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                reviseMutation.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className="font-medium text-zinc-600">Motor baz (TRY)</span>
                  <input
                    required
                    value={mf.baseMotor}
                    onChange={(e) => setMf((s) => ({ ...s, baseMotor: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 font-mono text-sm outline-none focus:border-brand/40"
                  />
                </label>
                <label className="text-xs">
                  <span className="font-medium text-zinc-600">Otomobil baz (TRY)</span>
                  <input
                    required
                    value={mf.baseCar}
                    onChange={(e) => setMf((s) => ({ ...s, baseCar: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 font-mono text-sm outline-none focus:border-brand/40"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className="font-medium text-zinc-600">kg (motor)</span>
                  <input
                    value={mf.perKgMotor}
                    onChange={(e) => setMf((s) => ({ ...s, perKgMotor: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 font-mono text-sm outline-none focus:border-brand/40"
                  />
                </label>
                <label className="text-xs">
                  <span className="font-medium text-zinc-600">kg (araç)</span>
                  <input
                    value={mf.perKgCar}
                    onChange={(e) => setMf((s) => ({ ...s, perKgCar: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 font-mono text-sm outline-none focus:border-brand/40"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className="font-medium text-zinc-600">Gece çarpanı</span>
                  <input
                    value={mf.nightMultiplier}
                    onChange={(e) => setMf((s) => ({ ...s, nightMultiplier: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 font-mono text-sm outline-none focus:border-brand/40"
                  />
                </label>
                <label className="text-xs">
                  <span className="font-medium text-zinc-600">Dalgalanma</span>
                  <input
                    value={mf.surgeMultiplier}
                    onChange={(e) => setMf((s) => ({ ...s, surgeMultiplier: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 font-mono text-sm outline-none focus:border-brand/40"
                  />
                </label>
              </div>

              {reviseMutation.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">
                  {(reviseMutation.error as Error).message}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditCell(null)}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={reviseMutation.isPending}
                  className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
                >
                  {reviseMutation.isPending ? 'Kaydediliyor…' : 'Yeni versiyonu kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
