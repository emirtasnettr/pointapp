'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { GlassCard } from '@/components/admin/GlassCard';
import { apiPost } from '@/lib/api';
import { cn } from '@/lib/cn';

type CustomerTypeApi = 'INDIVIDUAL' | 'CORPORATE' | 'SOLE_PROPRIETOR';

type DetailResponse = {
  publicId: string;
};

const TYPE_OPTIONS: { value: CustomerTypeApi; label: string }[] = [
  { value: 'INDIVIDUAL', label: 'Bireysel' },
  { value: 'CORPORATE', label: 'Kurumsal' },
  { value: 'SOLE_PROPRIETOR', label: 'Şahıs işletmesi' },
];

export default function NewCustomerPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [customerType, setCustomerType] = useState<CustomerTypeApi>('INDIVIDUAL');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [tcKimlikNo, setTcKimlikNo] = useState('');

  const createM = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        customerType,
        phone: phone.replace(/\s|-/g, '').trim(),
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      if (customerType === 'CORPORATE') {
        body.companyName = companyName.trim();
        body.taxNumber = taxNumber.replace(/\D/g, '').trim();
      }
      if (customerType === 'INDIVIDUAL' || customerType === 'SOLE_PROPRIETOR') {
        body.tcKimlikNo = tcKimlikNo.replace(/\D/g, '').trim();
      }
      return apiPost<DetailResponse>('/staff/customers', body);
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['staff', 'customers'] });
      router.push(`/customers/${encodeURIComponent(data.publicId)}`);
    },
  });

  const err = createM.error as Error | undefined;

  return (
    <>
      <PageHeader
        title="Yeni müşteri"
        description="Telefon ve e-posta benzersiz olmalıdır. Kurallar müşteri self-kayıt ile aynıdır (T.C. / VKN doğrulaması)."
        actions={
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand/30"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Listeye dön
          </Link>
        }
      />

      <GlassCard className="max-w-xl">
        <div className="space-y-4 text-sm">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Müşteri tipi</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setCustomerType(o.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                    customerType === o.value
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Ad</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Soyad</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Cep telefonu</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5xx xxx xx xx"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Şifre (en az 8 karakter)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>

          {customerType === 'CORPORATE' ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Şirket ünvanı</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Vergi numarası (10 hane)</label>
                <input
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand/40"
                />
              </div>
            </>
          ) : null}

          {customerType === 'INDIVIDUAL' || customerType === 'SOLE_PROPRIETOR' ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">T.C. Kimlik no (11 hane)</label>
              <input
                value={tcKimlikNo}
                onChange={(e) => setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-brand/40"
              />
            </div>
          ) : null}

          {err ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err.message}</p>
          ) : null}

          <button
            type="button"
            disabled={createM.isPending}
            onClick={() => void createM.mutateAsync()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
          >
            {createM.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden />
            )}
            Müşteri oluştur
          </button>
        </div>
      </GlassCard>
    </>
  );
}
