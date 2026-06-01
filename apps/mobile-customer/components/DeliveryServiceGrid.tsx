import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import type { DeliveryServiceCard } from '../lib/delivery-service-types';
import { DELIVERY_SERVICE_CARDS } from '../lib/delivery-service-types';
import { customerTheme as t } from '../lib/theme';

type Props = {
  onSelect: (type: DeliveryServiceCard['type']) => void;
  selectedType?: DeliveryServiceCard['type'] | null;
};

const glass = {
  bg: 'rgba(255,255,255,0.72)',
  border: 'rgba(255,255,255,0.88)',
  borderSubtle: 'rgba(148, 163, 184, 0.18)',
} as const;

function cardShadow(selected: boolean) {
  return Platform.select({
    ios: {
      shadowColor: selected ? t.brand : '#28303d',
      shadowOffset: { width: 0, height: selected ? 12 : 10 },
      shadowOpacity: selected ? 0.14 : 0.06,
      shadowRadius: selected ? 26 : 22,
    },
    default: {
      elevation: selected ? 6 : 4,
      shadowColor: '#000',
    },
  });
}

/** İki modern “glass” kart — yan yana. */
export function DeliveryServiceGrid({ onSelect, selectedType }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {DELIVERY_SERVICE_CARDS.map((item) => {
          const Icon = item.Icon;
          const selected = selectedType === item.type;
          const g = [...item.accentGradient] as [string, string];
          return (
            <Pressable
              key={item.type}
              onPress={() => onSelect(item.type)}
              android_ripple={{ color: 'rgba(22,178,75,0.14)' }}
              style={({ pressed }) => [
                styles.cardOuter,
                selected && styles.cardOuterSelected,
                cardShadow(selected),
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
                  <Text style={[styles.cta, selected && styles.ctaOn]}>Seç</Text>
                  <ChevronRight size={18} color={selected ? t.brand : t.inkSoft} strokeWidth={2.4} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  cardOuter: {
    flex: 1,
    borderRadius: t.radiusLg,
    overflow: 'hidden',
    backgroundColor: glass.bg,
    borderWidth: 1,
    borderColor: glass.borderSubtle,
    minHeight: 168,
  },
  cardOuterSelected: {
    borderColor: t.brandBorder,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  cardPressed: { transform: [{ scale: 0.985 }] },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
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
  cta: { fontSize: 13, fontWeight: '700', color: t.inkSoft, letterSpacing: 0.15 },
  ctaOn: { color: t.brand },
});
