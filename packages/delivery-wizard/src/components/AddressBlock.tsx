'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, MapPin, PenLine } from 'lucide-react';
import type { GeoDistrict, SavedAddressRow } from '../types';
import { FormCard } from './FormCard';
import { GeoPickerModal } from './GeoPickerModal';

const fieldClass =
  'mt-1.5 w-full rounded-[10px] border border-zinc-200 bg-zinc-50/90 px-3.5 py-3 text-base text-zinc-900 outline-none transition focus:border-[#16B24B]/40 focus:ring-2 focus:ring-[#16B24B]/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label className="mb-3 block last:mb-0">
      <span className="text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">{label}</span>
      <Tag
        type={multiline ? undefined : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        className={fieldClass}
      />
    </label>
  );
}

export function AddressBlock({
  tone,
  title,
  hint,
  saved,
  districts,
  fetchNeighborhoods,
  kind,
  setKind,
  selectedId,
  setSelectedId,
  manualLabel,
  setManualLabel,
  manualLine1,
  setManualLine1,
  manualDistrictId,
  setManualDistrictId,
  manualNeighborhoodId,
  setManualNeighborhoodId,
  manualNeighborhoodName,
  setManualNeighborhoodName,
  saveAddress,
  setSaveAddress,
}: {
  tone: 'pickup' | 'drop';
  title: string;
  hint: string;
  saved: SavedAddressRow[];
  districts: GeoDistrict[];
  fetchNeighborhoods: (districtId: string) => Promise<{ id: string; name: string }[]>;
  kind: 'saved' | 'manual';
  setKind: (k: 'saved' | 'manual') => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  manualLabel: string;
  setManualLabel: (s: string) => void;
  manualLine1: string;
  setManualLine1: (s: string) => void;
  manualDistrictId: string | null;
  setManualDistrictId: (id: string | null) => void;
  manualNeighborhoodId: string | null;
  setManualNeighborhoodId: (id: string | null) => void;
  manualNeighborhoodName: string;
  setManualNeighborhoodName: (s: string) => void;
  saveAddress: boolean;
  setSaveAddress: (v: boolean) => void;
}) {
  const accent = tone === 'pickup' ? '#16B24B' : '#6366f1';
  const hasSaved = saved.length > 0;
  const hasSelectable = saved.some((x) => x.serviceAvailable);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = selectedId ? saved.find((x) => x.id === selectedId) : undefined;

  const [distOpen, setDistOpen] = useState(false);
  const [nbOpen, setNbOpen] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
  const [nbLoading, setNbLoading] = useState(false);

  useEffect(() => {
    if (!manualDistrictId) {
      setNeighborhoods([]);
      return;
    }
    let cancelled = false;
    setNbLoading(true);
    void fetchNeighborhoods(manualDistrictId)
      .then((list) => {
        if (!cancelled) setNeighborhoods(list);
      })
      .catch(() => {
        if (!cancelled) setNeighborhoods([]);
      })
      .finally(() => {
        if (!cancelled) setNbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [manualDistrictId, fetchNeighborhoods]);

  const districtTitle = districts.find((d) => d.id === manualDistrictId)?.name ?? '';

  useEffect(() => {
    if (kind !== 'saved' || !selectedId) return;
    const sel = saved.find((x) => x.id === selectedId);
    if (sel && !sel.serviceAvailable) {
      const fallback = saved.find((x) => x.serviceAvailable);
      setSelectedId(fallback?.id ?? null);
    }
  }, [kind, selectedId, saved, setSelectedId]);

  return (
    <FormCard title={title} subtitle={hint}>
      <div className="mb-3.5 flex gap-2 rounded-xl bg-zinc-100/90 p-1 dark:bg-white/5">
        <button
          type="button"
          onClick={() => {
            if (!hasSelectable) return;
            setKind('saved');
            const first = saved.find((x) => x.serviceAvailable);
            if (first) setSelectedId(first.id);
          }}
          disabled={!hasSaved || !hasSelectable}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition ${
            kind === 'saved'
              ? 'bg-white text-[#16B24B] shadow-sm dark:bg-zinc-900'
              : 'text-zinc-500 disabled:opacity-45'
          }`}
        >
          <MapPin className="h-4 w-4" strokeWidth={2.2} />
          Kayıtlı
        </button>
        <button
          type="button"
          onClick={() => setKind('manual')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition ${
            kind === 'manual'
              ? 'bg-white text-[#16B24B] shadow-sm dark:bg-zinc-900'
              : 'text-zinc-500'
          }`}
        >
          <PenLine className="h-4 w-4" strokeWidth={2.2} />
          Manuel
        </button>
      </div>
      {!hasSaved ? (
        <p className="mb-2.5 text-xs font-semibold text-amber-700">Hesabınızda kayıtlı adres yok; manuel giriş kullanın.</p>
      ) : null}
      {hasSaved && !hasSelectable ? (
        <p className="mb-2.5 text-xs font-semibold text-amber-700">
          Kayıtlı adreslerinizin tamamı şu an hizmet dışındadır; teslimat için manuel adres girin.
        </p>
      ) : null}

      {kind === 'saved' ? (
        <>
          <p className="mb-2 text-xs font-bold text-zinc-600">Kayıtlı adres</p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-[10px] border bg-white px-3 py-3 text-left dark:bg-zinc-900"
            style={{ borderColor: selected ? accent : undefined }}
          >
            <span className="min-w-0 flex-1">
              {selected ? (
                <>
                  <span className="block truncate text-[15px] font-extrabold text-zinc-900 dark:text-zinc-50">
                    {selected.title}
                  </span>
                  <span className="mt-1 block text-[13px] font-medium leading-snug text-zinc-600">
                    {selected.line1} · {selected.city}
                  </span>
                  {!selected.serviceAvailable && selected.serviceUnavailableReason ? (
                    <span className="mt-2 block text-xs font-semibold text-amber-700">
                      {selected.serviceUnavailableReason}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-[15px] font-semibold text-zinc-400">Adres seçin…</span>
              )}
            </span>
            <ChevronDown className="h-[22px] w-[22px] shrink-0 text-zinc-500" strokeWidth={2.2} />
          </button>

          {pickerOpen ? (
            <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
              <button type="button" className="absolute inset-0 bg-slate-900/45" onClick={() => setPickerOpen(false)} />
              <div className="relative z-[1] flex max-h-[72vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border bg-white shadow-xl sm:rounded-2xl dark:bg-zinc-900">
                <p className="px-[18px] pb-2 pt-4 text-[17px] font-extrabold">Adres seçin</p>
                <div className="max-h-[360px] overflow-y-auto">
                  {saved.map((a) => {
                    const on = a.id === selectedId;
                    const dis = !a.serviceAvailable;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={dis}
                        onClick={() => {
                          if (dis) return;
                          setSelectedId(a.id);
                          setPickerOpen(false);
                        }}
                        className={`block w-full border-b border-zinc-100 px-[18px] py-3.5 text-left dark:border-white/10 ${
                          on ? 'border-l-4 bg-zinc-50 dark:bg-white/5' : ''
                        } ${dis ? 'opacity-65' : ''}`}
                        style={on ? { borderLeftColor: accent } : undefined}
                      >
                        <span className="text-base font-extrabold text-zinc-900">{a.title}</span>
                        <span className="mt-1 block text-sm text-zinc-600">{a.line1}</span>
                        <span className="mt-1 block text-xs font-bold text-zinc-500">{a.city}</span>
                        {dis && a.serviceUnavailableReason ? (
                          <span className="mt-2 block text-xs font-semibold text-amber-700">{a.serviceUnavailableReason}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="bg-zinc-50 py-3.5 text-center text-base font-extrabold text-[#16B24B] dark:bg-white/5"
                >
                  Kapat
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="mb-3.5 text-[13px] font-medium leading-snug text-zinc-500">
            İlçe ve mahalle seçin; sokak / bina bilgisini yazın. İl alanı yoktur (İstanbul).
          </p>
          <Field
            label="Kısa ad (isteğe bağlı)"
            value={manualLabel}
            onChange={setManualLabel}
            placeholder="Örn. Şube — boş bırakılabilir"
          />
          <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">İlçe</p>
          <button
            type="button"
            onClick={() => setDistOpen(true)}
            className="mb-3 flex w-full items-center gap-2.5 rounded-[10px] border bg-zinc-50/90 px-3 py-3 text-left dark:bg-zinc-900"
            style={{ borderColor: manualDistrictId ? accent : undefined }}
          >
            <MapPin className="h-[18px] w-[18px]" style={{ color: accent }} strokeWidth={2.2} />
            <span className={`flex-1 truncate text-base font-bold ${districtTitle ? 'text-zinc-900' : 'text-zinc-400'}`}>
              {districtTitle || 'İlçe seçin…'}
            </span>
            <ChevronDown className="h-5 w-5 text-zinc-500" strokeWidth={2.2} />
          </button>
          <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">Mahalle</p>
          <button
            type="button"
            onClick={() => manualDistrictId && setNbOpen(true)}
            disabled={!manualDistrictId}
            className="mb-3 flex w-full items-center gap-2.5 rounded-[10px] border bg-zinc-50/90 px-3 py-3 text-left disabled:opacity-45 dark:bg-zinc-900"
            style={{ borderColor: manualNeighborhoodId ? accent : undefined }}
          >
            <MapPin className="h-[18px] w-[18px] text-indigo-500" strokeWidth={2.2} />
            <span
              className={`flex-1 truncate text-base font-bold ${manualNeighborhoodName ? 'text-zinc-900' : 'text-zinc-400'}`}
            >
              {manualNeighborhoodName || 'Mahalle seçin…'}
            </span>
            <ChevronDown className="h-5 w-5 text-zinc-500" strokeWidth={2.2} />
          </button>
          <Field
            label="Sokak, cadde, bina no, kat / daire"
            value={manualLine1}
            onChange={setManualLine1}
            placeholder="Örn. Büyükdere Cad. No:199"
            multiline
          />
          <div className="flex items-center gap-3.5 px-1 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold text-zinc-900 dark:text-zinc-50">Adresi kaydet</p>
              <p className="mt-1 text-xs font-medium leading-snug text-zinc-500">
                İşaretlerseniz bu adres kayıtlı adreslerinize eklenir.
              </p>
            </div>
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              className="h-5 w-5 accent-[#16B24B]"
            />
          </div>
          <GeoPickerModal
            open={distOpen}
            title="İlçe seçin"
            items={districts.map((d) => ({ id: d.id, title: d.name }))}
            onClose={() => setDistOpen(false)}
            onSelect={(id) => {
              setManualDistrictId(id);
              setManualNeighborhoodId(null);
              setManualNeighborhoodName('');
            }}
          />
          <GeoPickerModal
            open={nbOpen}
            title="Mahalle seçin"
            items={neighborhoods.map((n) => ({ id: n.id, title: n.name }))}
            loading={nbLoading}
            onClose={() => setNbOpen(false)}
            onSelect={(id) => {
              const n = neighborhoods.find((x) => x.id === id);
              setManualNeighborhoodId(id);
              setManualNeighborhoodName(n?.name ?? '');
            }}
          />
        </>
      )}
    </FormCard>
  );
}
