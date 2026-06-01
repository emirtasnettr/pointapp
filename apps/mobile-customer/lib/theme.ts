/** Müşteri uygulaması — yumuşak aydınlık palet, premium kart gölgeleri, marka yeşili */
export const customerTheme = {
  /** Ana zemin — hafif soğuk gri, göz yormayan */
  bg: '#e6e9f0',
  surface: '#fcfcfe',
  surfaceMuted: '#f3f4f8',
  /** Cam kart / sheet kenarı */
  border: 'rgba(148, 163, 184, 0.2)',
  borderStrong: 'rgba(148, 163, 184, 0.32)',
  ink: '#1a2230',
  inkSecondary: '#4b5569',
  inkMuted: '#6b728e',
  inkSoft: '#9aa3b2',
  brand: '#16B24B',
  brandMuted: 'rgba(22, 178, 75, 0.09)',
  brandBorder: 'rgba(22, 178, 75, 0.28)',
  onBrand: '#ffffff',
  danger: '#dc2626',
  dangerBg: 'rgba(254, 242, 242, 0.92)',
  success: '#15803d',
  warn: '#c97709',
  chipBg: 'rgba(224, 242, 231, 0.95)',
  chipText: '#166534',
  /** Giriş / kahraman — biraz daha derin ama yumuşak geçiş */
  gradientHero: ['#1fc759', '#16B24B', '#119544'] as const,
  radiusLg: 22,
  radiusMd: 16,
  radiusSm: 12,
  radiusXl: 28,
  /** Genel kart — geniş blur hissi, düşük opaklık */
  shadow: {
    shadowColor: '#28303d',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 28,
    elevation: 4,
  } as const,
  /** Küçük öğeler, iç içe yüzeyler */
  shadowTight: {
    shadowColor: '#28303d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  } as const,
};
