import type { ReactNode } from 'react';

/** Mobil içerik; masaüstünde okunabilir genişlik. */
export function DeliveryWizardLayout({
  variant = 'form',
  children,
}: {
  variant?: 'service' | 'form';
  children: ReactNode;
}) {
  const widthClass =
    variant === 'service'
      ? 'max-w-2xl sm:max-w-3xl lg:max-w-4xl'
      : 'max-w-lg md:max-w-2xl';

  return <div className={`mx-auto w-full px-4 pb-12 pt-3 ${widthClass}`}>{children}</div>;
}
