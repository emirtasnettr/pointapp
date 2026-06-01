import Link from 'next/link';
import { ArrowUpRight, Layers } from 'lucide-react';
import { marketingServicePath, type PublicMarketingService } from '@/lib/marketing-services';

type Props = {
  service: PublicMarketingService;
};

export function MarketingServiceCard({ service }: Props) {
  return (
    <Link
      href={marketingServicePath(service.slug)}
      className="group flex h-full flex-col rounded-3xl bg-white p-6 ring-1 ring-zinc-200/80 transition duration-300 hover:ring-brand/30 hover:shadow-[0_18px_50px_-22px_rgba(22,178,75,0.35)] sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center sm:h-[132px] sm:w-[132px]">
          {service.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={service.iconUrl}
              alt=""
              className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <Layers className="h-12 w-12 text-zinc-300" strokeWidth={1.5} aria-hidden />
          )}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200/90 text-zinc-400 transition duration-300 group-hover:border-brand/30 group-hover:bg-brand group-hover:text-white">
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        <h2 className="text-[1.35rem] font-bold leading-tight tracking-tight text-zinc-900 transition group-hover:text-brand">
          {service.title}
        </h2>
        <p className="mt-3 flex-1 text-[15px] leading-relaxed text-zinc-600">{service.summary}</p>
      </div>

      <p className="mt-6 border-t border-zinc-100 pt-5 text-sm font-semibold text-brand">
        Hizmeti incele
      </p>
    </Link>
  );
}
