import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import type { DeliveryServiceCard } from '../lib/delivery-service-types';
import { getDeliveryTypeSectionEntries } from '../lib/delivery-type-section-entries';
import { customerTheme as t } from '../lib/theme';

type Props = {
  onSelect: (type: DeliveryServiceCard['type']) => void;
};

const H_PAD = 18;
const GAP = 12;

/** Ne gönderiyorsunuz: ana sayfa ile aynı öğeler; sade yüzeyler (yeni teslimat akışı). */
export function DeliveryServiceWizardSelect({ onSelect }: Props) {
  const { width: winW } = useWindowDimensions();
  const innerW = Math.max(0, winW - H_PAD * 2);
  const cellW = Math.max(120, (innerW - GAP) / 2);

  const entries = getDeliveryTypeSectionEntries();
  const needsSpacer = entries.length % 2 === 1;

  return (
    <View style={[styles.grid, { width: innerW }]}>
      {entries.map((entry) => {
        if (entry.kind === 'selectable') {
          const item = entry.data;
          const Icon = item.Icon;
          const g = [...item.accentGradient] as [string, string];
          return (
            <Pressable
              key={item.type}
              onPress={() => onSelect(item.type)}
              android_ripple={{ color: 'rgba(22,178,75,0.14)' }}
              style={({ pressed }) => [
                styles.cardOuter,
                { width: cellW },
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
          <View key={item.id} style={[styles.cardOuter, styles.cardSoon, { width: cellW }]}>
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
      {needsSpacer ? <View style={{ width: cellW }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GAP,
    rowGap: GAP,
    alignSelf: 'center',
  },
  cardOuter: {
    borderRadius: t.radiusLg,
    overflow: 'hidden',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    minHeight: 152,
    ...t.shadow,
  },
  cardSoon: { opacity: 0.88 },
  cardPressed: { transform: [{ scale: 0.985 }] },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    flex: 1,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
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
