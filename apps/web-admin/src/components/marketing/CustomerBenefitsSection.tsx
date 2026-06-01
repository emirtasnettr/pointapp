import {
  BadgePercent,
  Clock,
  PackageCheck,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

type Benefit = {
  n: string;
  icon: LucideIcon;
  title: string;
  desc: string;
};

const BENEFITS: Benefit[] = [
  {
    n: '01',
    icon: Clock,
    title: '2 Saatte Teslimat',
    desc: 'Şehir içi gönderiniz hızlı rota ile aynı gün kapınızda; anlık durum ve konum takibi.',
  },
  {
    n: '02',
    icon: BadgePercent,
    title: 'Uygun Fiyat',
    desc: 'İlçeden ilçeye şeffaf ücret; gönderi oluşturmadan önce fiyatı görün, sürpriz maliyet yok.',
  },
  {
    n: '03',
    icon: ShieldCheck,
    title: 'Güvenli Ödeme',
    desc: 'Kart ve dijital cüzdan ile güvenli tahsilat; tüm işlemler kayıt altında, gönül rahatlığıyla.',
  },
  {
    n: '04',
    icon: PackageCheck,
    title: 'Sigortalı Gönderi',
    desc: 'Gönderiniz sigorta kapsamında; evrak ve paketleriniz için ekstra güvence.',
  },
];

export function CustomerBenefitsSection() {
  return (
    <section id="ozellikler" className="relative scroll-mt-[calc(6rem*1.15)] overflow-hidden bg-white py-20 sm:py-28">
      <div
        className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-brand/8 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-8 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            Neden Point?
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Gönderiniz için ihtiyacınız olan her şey
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600">
            Hızlı teslimat, şeffaf fiyat ve güvenli ödeme — şehir içi gönderilerinizi tek platformdan
            yönetin.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {BENEFITS.map((b) => (
            <article
              key={b.title}
              className="group flex h-full flex-col rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50/90 to-white p-6 shadow-soft transition duration-300 hover:border-brand/25 hover:shadow-[0_12px_40px_-12px_rgba(22,178,75,0.12)] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/15 transition duration-300 group-hover:bg-brand group-hover:text-white group-hover:ring-brand/30">
                  <b.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                </span>
                <span
                  className="text-3xl font-bold tabular-nums tracking-tight text-zinc-200 transition duration-300 group-hover:text-brand/20"
                  aria-hidden
                >
                  {b.n}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-bold tracking-tight text-zinc-900">{b.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">{b.desc}</p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-zinc-500">
          Bireysel veya kurumsal hesabınızla dakikalar içinde gönderi oluşturun; fiyatı önceden görün,
          teslimatı canlı takip edin.
        </p>
      </div>
    </section>
  );
}
