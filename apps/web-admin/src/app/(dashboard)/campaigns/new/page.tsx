'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, PlusCircle } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiPost } from '@/lib/api';

type DetailResponse = {
  campaign: { id: string; name: string };
};

function fromDatetimeLocal(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  return new Date(t).toISOString();
}

export default function NewCampaignPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [configJson, setConfigJson] = useState('');

  const createM = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (!n) throw new Error('Kampanya adı zorunludur.');

      let config: Record<string, unknown> | undefined;
      const rawCfg = configJson.trim();
      if (rawCfg) {
        try {
          const parsed = JSON.parse(rawCfg) as unknown;
          if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Config bir JSON nesnesi olmalı.');
          }
          config = parsed as Record<string, unknown>;
        } catch (e) {
          throw new Error(e instanceof Error ? e.message : 'Config geçerli JSON olmalı.');
        }
      }

      const body: Record<string, unknown> = {
        name: n,
        active,
      };
      const c = code.trim();
      if (c) body.code = c.toUpperCase();
      const st = startsLocal.trim() ? fromDatetimeLocal(startsLocal) : null;
      const en = endsLocal.trim() ? fromDatetimeLocal(endsLocal) : null;
      if (st) body.startsAt = st;
      if (en) body.endsAt = en;
      if (maxUses.trim()) {
        const m = Number(maxUses.trim());
        if (Number.isNaN(m) || m < 1) throw new Error('Müşteri limiti en az 1 olmalı veya boş bırakın.');
        body.maxUsesPerCustomer = m;
      }
      if (config) body.config = config;

      return apiPost<DetailResponse>('/staff/campaigns', body);
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['staff', 'campaigns'] });
      router.push(`/campaigns/${encodeURIComponent(data.campaign.id)}`);
    },
  });

  const err = createM.error as Error | undefined;

  return (
    <>
      <div className="mb-4">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Kampanya listesi
        </Link>
      </div>

      <PageHeader
        title="Yeni kampanya"
        description="Kodu müşteri teslimat oluştururken girer. Kod boş bırakılırsa kampanya yalnızca adıyla kayıtlı kalır (müşteri kodu kullanılamaz)."
        actions={
          <button
            type="button"
            disabled={createM.isPending}
            onClick={() => void createM.mutateAsync().catch(() => {})}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand/90 disabled:opacity-50"
          >
            {createM.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PlusCircle className="h-4 w-4" aria-hidden />}
            Oluştur
          </button>
        }
      />

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err.message}</p>
      ) : null}

      <GlassCard>
        <div className="grid max-w-xl gap-4">
          <label className="text-xs">
            <span className="font-medium text-zinc-600">Ad *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
              placeholder="Örn. Kış indirimi"
            />
          </label>
          <label className="text-xs">
            <span className="font-medium text-zinc-600">Kod (isteğe bağlı)</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand/40"
              placeholder="Örn. KIS2026"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="font-medium text-zinc-600">Aktif</span>
          </label>
          <label className="text-xs">
            <span className="font-medium text-zinc-600">Başlangıç (boş = hemen)</span>
            <input
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </label>
          <label className="text-xs">
            <span className="font-medium text-zinc-600">Bitiş (boş = süresiz)</span>
            <input
              type="datetime-local"
              value={endsLocal}
              onChange={(e) => setEndsLocal(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </label>
          <label className="text-xs">
            <span className="font-medium text-zinc-600">Müşteri başına max kullanım (boş = sınırsız)</span>
            <input
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="Örn. 2"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </label>
          <label className="text-xs">
            <span className="font-medium text-zinc-600">Config (JSON, isteğe bağlı)</span>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              rows={4}
              placeholder='{"discountPct":10,"minOrderTry":100}'
              className="mt-1 w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand/40"
            />
          </label>
        </div>
      </GlassCard>
    </>
  );
}
