import { ArrowRight, MapPinned, PackageCheck, Radio, type LucideIcon } from 'lucide-react';

type Step = {
  n: string;
  icon: LucideIcon;
  title: string;
  desc: string;
};

const STEPS: Step[] = [
  {
    n: '01',
    icon: MapPinned,
    title: 'Gönderi oluştur',
    desc: 'Nereden–nereye seçin, araç tipini belirleyin; ücreti anında görüp tek tıkla onaylayın.',
  },
  {
    n: '02',
    icon: Radio,
    title: 'Canlı takip edin',
    desc: 'Kurye atanınca bildirim alın; yolda, alındı ve teslim edildi adımlarını anlık izleyin.',
  },
  {
    n: '03',
    icon: PackageCheck,
    title: 'Kapıda teslim',
    desc: 'Teslim tamamlanınca işlem kapanır; ödemeniz güvenle sonlanır, geçmişiniz panelde kalır.',
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="nasil-calisir"
      className="relative scroll-mt-[calc(6rem*1.15)] overflow-hidden py-20 text-white sm:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand via-brand to-emerald-600"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
            Nasıl çalışır?
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Üç adımda gönderiniz kapıda
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/85">
            Şeffaf fiyat, net durum bildirimi ve güvenli ödeme — dakikalar içinde başlayın, teslimata kadar
            takip edin.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
          <div
            className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-white/35 to-transparent md:block"
            aria-hidden
          />

          {STEPS.map((step) => (
            <li key={step.n} className="relative">
              <article className="group flex h-full flex-col rounded-3xl border border-white/20 bg-white/10 p-6 shadow-soft backdrop-blur-md transition duration-300 hover:border-white/35 hover:bg-white/15 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 transition group-hover:bg-white group-hover:text-brand">
                    <step.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <span
                    className="text-3xl font-bold tabular-nums tracking-tight text-white/20 transition group-hover:text-white/35"
                    aria-hidden
                  >
                    {step.n}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-bold tracking-tight">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/75">{step.desc}</p>
              </article>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex justify-center">
          <a
            href="/gonderi"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-brand shadow-soft transition hover:bg-emerald-50"
          >
            Hemen gönderi oluştur
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
