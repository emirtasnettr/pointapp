import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, ChevronRight, Handshake, ImageIcon, Megaphone } from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { resolveMediaUrlForDevice } from '../../lib/api';
import {
  fetchPublicMarketingCampaigns,
  formatCampaignDateRange,
  PHASE_LABEL,
  type PublicMarketingCampaign,
} from '../../lib/marketing-campaigns';
import { customerTheme as t } from '../../lib/theme';

function phasePillStyle(phase: PublicMarketingCampaign['phase']) {
  if (phase === 'expired') return styles.phaseExpired;
  if (phase === 'active') return styles.phaseActive;
  return styles.phaseUpcoming;
}

function CampaignRow({ item, onPress }: { item: PublicMarketingCampaign; onPress: () => void }) {
  const expired = item.phase === 'expired';
  const imageUri = resolveMediaUrlForDevice(item.imageUrl);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
      onPress={onPress}
    >
      <View style={[styles.cover, expired && styles.coverExpired]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={[styles.coverImg, expired && { opacity: 0.75 }]} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <ImageIcon color={expired ? t.inkSoft : t.brand} size={32} strokeWidth={2} />
          </View>
        )}
        <View style={[styles.phasePill, phasePillStyle(item.phase)]}>
          <Text
            style={[
              styles.phaseTxt,
              item.phase === 'upcoming' && styles.phaseTxtBrand,
              item.phase === 'expired' && styles.phaseTxtMuted,
            ]}
          >
            {PHASE_LABEL[item.phase]}
          </Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <View style={styles.cardBody}>
          {item.partnerLabel ? (
            <View style={styles.partnerRow}>
              <Handshake color={t.brand} size={14} strokeWidth={2} />
              <Text style={styles.partner}>{item.partnerLabel}</Text>
            </View>
          ) : null}
          <Text style={[styles.title, expired && styles.titleExpired]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.summary} numberOfLines={3}>
            {item.summary}
          </Text>
          <View style={styles.dateRow}>
            <Calendar color={t.inkSoft} size={14} />
            <Text style={styles.dateTxt}>{formatCampaignDateRange(item.startsAt, item.endsAt)}</Text>
          </View>
        </View>
        <ChevronRight color={t.inkSoft} size={22} />
      </View>
    </Pressable>
  );
}

export default function CampaignsListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PublicMarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const data = await fetchPublicMarketingCampaigns();
      setItems(data.items);
    } catch (e) {
      setErr((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {err ? (
        <GlassCard style={styles.errCard}>
          <Text style={styles.errTxt}>{err}</Text>
        </GlassCard>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(x) => x.slug}
        contentContainerStyle={items.length === 0 ? styles.emptyGrow : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={t.brand}
          />
        }
        ListEmptyComponent={
          !err ? (
            <View style={styles.empty}>
              <Megaphone color={t.inkSoft} size={48} strokeWidth={1.6} />
              <Text style={styles.emptyTitle}>Henüz kampanya yok</Text>
              <Text style={styles.emptySub}>Yeni kampanyalar yayınlandığında burada listelenecek.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <CampaignRow item={item} onPress={() => router.push(`/campaigns/${item.slug}`)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 32, gap: 14 },
  emptyGrow: { flexGrow: 1, padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  emptyTitle: { color: t.ink, fontSize: 17, fontWeight: '700', marginTop: 8 },
  emptySub: { color: t.inkMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errCard: { margin: 16, marginBottom: 0 },
  errTxt: { color: t.danger, fontSize: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  card: {
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    overflow: 'hidden',
    ...t.shadow,
  },
  cover: { aspectRatio: 16 / 9, backgroundColor: 'rgba(22, 178, 75, 0.08)' },
  coverExpired: { backgroundColor: t.border },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phasePill: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  phaseActive: { backgroundColor: t.brand },
  phaseUpcoming: { backgroundColor: t.surface },
  phaseExpired: { backgroundColor: 'rgba(148, 163, 184, 0.9)' },
  phaseTxt: { fontSize: 11, fontWeight: '700', color: t.onBrand },
  phaseTxtBrand: { color: t.brand },
  phaseTxtMuted: { color: t.ink },
  cardBody: { flex: 1, padding: 14 },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  partner: { color: t.brand, fontSize: 12, fontWeight: '700' },
  title: { color: t.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  titleExpired: { color: t.inkMuted },
  summary: { color: t.inkSecondary, fontSize: 14, lineHeight: 20, marginTop: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  dateTxt: { color: t.inkMuted, fontSize: 12 },
});
