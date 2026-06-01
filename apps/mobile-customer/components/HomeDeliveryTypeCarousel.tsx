import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import type { CustomerDeliveryServiceType } from '../lib/delivery-service-types';
import { getDeliveryTypeSectionEntries } from '../lib/delivery-type-section-entries';
import { deliveryTypeCardShadow } from '../lib/delivery-type-card-shadow';
import { customerTheme as t } from '../lib/theme';

const glass = {
  bg: 'rgba(255, 255, 255, 0.72)',
  borderSubtle: 'rgba(148, 163, 184, 0.18)',
} as const;

type Props = {
  onSelectType: (type: CustomerDeliveryServiceType) => void;
};

/** Ana sayfa “Teslimat türü”: yatay kaydırma; öğe listesi `getDeliveryTypeSectionEntries()` (Yeni teslimat adımı ile aynı). */
export function HomeDeliveryTypeCarousel({ onSelectType }: Props) {
  const { width: winW } = useWindowDimensions();
  /** Ana sayfa ile aynı yatay iç boşluk (quickRow / başlıklar = 16+16) */
  const pageInset = 32;
  const gap = 12;
  /** Görünür alanda 2 tam kart + üçüncünün bir kısmı (kaydırılabilir olduğu anlaşılsın) */
  const peekThird = 40;
  const innerW = Math.max(0, winW - pageInset);
  const cardW = Math.max(124, (innerW - 2 * gap - peekThird) / 2);

  const entries = getDeliveryTypeSectionEntries();
  const last = entries.length - 1;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      nestedScrollEnabled
      contentContainerStyle={[styles.scrollInner, { paddingRight: 16 }]}
    >
      {entries.map((entry, index) => {
        if (entry.kind === 'selectable') {
          const item = entry.data;
          const Icon = item.Icon;
          const g = [...item.accentGradient] as [string, string];
          return (
            <Pressable
              key={item.type}
              onPress={() => onSelectType(item.type)}
              android_ripple={{ color: 'rgba(22,178,75,0.14)' }}
              style={({ pressed }) => [
                styles.cardOuter,
                { width: cardW, marginRight: index < last ? gap : 0 },
                deliveryTypeCardShadow(true),
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.cardBody}>
                <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBadge}>
                  <Icon size={24} color={t.onBrand} strokeWidth={2.2} />
                </LinearGradient>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.sub} numberOfLines={2}>
                  {item.subtitle}
                </Text>
                <View style={styles.footer}>
                  <Text style={styles.cta}>Seç</Text>
                  <ChevronRight size={18} color={t.brand} strokeWidth={2.4} />
                </View>
              </View>
            </Pressable>
          );
        }
        const item = entry.data;
        const Icon = item.Icon;
        const g = [...item.gradient] as [string, string];
        return (
          <View
            key={item.id}
            style={[
              styles.cardOuter,
              styles.cardSoon,
              { width: cardW, marginRight: index < last ? gap : 0 },
              deliveryTypeCardShadow(false),
            ]}
          >
            <View style={styles.cardBody}>
              <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBadge}>
                <Icon size={24} color={t.onBrand} strokeWidth={2.2} />
              </LinearGradient>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.sub} numberOfLines={3}>
                {item.subtitle}
              </Text>
              <View style={styles.footerSoon}>
                <Text style={styles.coming}>Yakında</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 2,
  },
  cardOuter: {
    borderRadius: t.radiusLg,
    overflow: 'hidden',
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.borderSubtle,
    minHeight: 158,
  },
  cardSoon: { opacity: 0.92 },
  cardPressed: { transform: [{ scale: 0.985 }] },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    flex: 1,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#28303d',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      default: { elevation: 3 },
    }),
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: t.ink,
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    color: t.inkMuted,
    marginTop: 6,
    lineHeight: 17,
    flexGrow: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
  },
  footerSoon: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.28)',
  },
  cta: { fontSize: 13, fontWeight: '700', color: t.brand, letterSpacing: 0.15 },
  coming: {
    fontSize: 13,
    fontWeight: '700',
    color: t.inkSoft,
    letterSpacing: 0.2,
  },
});
