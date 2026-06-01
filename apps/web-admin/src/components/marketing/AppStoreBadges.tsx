type Props = {
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  className?: string;
};

/** Resmi mağaza rozetleri — `public/badges/` (Apple / Google Play marka görselleri). */
const BADGE_CLASS = 'h-14 w-auto transition hover:opacity-90 sm:h-[3.75rem]';

const linkClass =
  'inline-block rounded-lg ring-offset-2 focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand';

export function AppStoreBadges({ appStoreUrl, googlePlayUrl, className }: Props) {
  const app = appStoreUrl?.trim() || null;
  const play = googlePlayUrl?.trim() || null;
  if (!app && !play) return null;

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-4'}>
      {app ? (
        <a
          href={app}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="App Store'dan indir"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/badges/app-store.svg"
            alt="Download on the App Store"
            width={162}
            height={48}
            className={BADGE_CLASS}
            loading="lazy"
            decoding="async"
          />
        </a>
      ) : null}
      {play ? (
        <a
          href={play}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="Google Play'den indir"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/badges/google-play.svg"
            alt="Get it on Google Play"
            width={180}
            height={54}
            className={BADGE_CLASS}
            loading="lazy"
            decoding="async"
          />
        </a>
      ) : null}
    </div>
  );
}
