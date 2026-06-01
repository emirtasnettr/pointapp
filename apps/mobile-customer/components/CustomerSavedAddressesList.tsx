import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPinned, ChevronRight } from 'lucide-react-native';
import { apiGetAuth } from '../lib/api';
import type { CustomerSavedAddressRow } from '../lib/customer-address-types';
import { customerTheme as t } from '../lib/theme';

export function CustomerSavedAddressesList() {
  const router = useRouter();
  const [items, setItems] = useState<CustomerSavedAddressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGetAuth<{ items: CustomerSavedAddressRow[] }>('/customer/addresses');
      setItems(data.items ?? []);
    } catch {
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

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
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
          <View style={styles.empty}>
            <MapPinned color={t.inkSoft} size={48} strokeWidth={1.6} />
            <Text style={styles.emptyTitle}>Henüz kayıtlı adres yok</Text>
            <Text style={styles.emptySub}>Sağ üstteki + ile İstanbul içinde yeni adres ekleyebilirsiniz.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const nb = item.neighborhood;
          const sub = nb ? `${nb.district.name} · ${nb.name}` : item.city;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
              onPress={() => router.push(`/addresses/${item.id}`)}
            >
              <View style={styles.iconWrap}>
                <MapPinned color={t.brand} size={22} strokeWidth={2.2} />
              </View>
              <View style={styles.mid}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {sub}
                </Text>
                <Text style={styles.line} numberOfLines={2}>
                  {item.line1}
                </Text>
                {!item.serviceAvailable && item.serviceUnavailableReason ? (
                  <Text style={styles.svcOff}>{item.serviceUnavailableReason}</Text>
                ) : null}
              </View>
              <ChevronRight color={t.inkSoft} size={22} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 24 },
  emptyGrow: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: t.radiusLg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: t.border,
    ...t.shadow,
  },
  iconWrap: { marginRight: 12 },
  mid: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '800', color: t.ink },
  sub: { marginTop: 4, fontSize: 13, fontWeight: '600', color: t.inkSecondary },
  line: { marginTop: 6, fontSize: 14, color: t.inkMuted, lineHeight: 19 },
  svcOff: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
    lineHeight: 17,
  },
  empty: { paddingHorizontal: 32, paddingTop: 48, alignItems: 'center' },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '800', color: t.ink },
  emptySub: { marginTop: 8, fontSize: 14, color: t.inkMuted, textAlign: 'center', lineHeight: 20 },
});
