import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect, type RelativePathString } from 'expo-router';
import { ChevronRight, FileText } from 'lucide-react-native';
import { apiGet } from '../../lib/api';
import type { LegalPageSummary, LegalPagesListResponse } from '../../lib/legal-pages';
import { courierTheme as t } from '../../lib/theme';

export default function LegalIndexScreen() {
  const router = useRouter();
  const [pages, setPages] = useState<LegalPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const legal = await apiGet<LegalPagesListResponse>('/public/courier/legal');
      setPages(legal.pages);
    } catch (e) {
      setPages([]);
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <View style={styles.card}>
        {pages.length === 0 ? (
          <Text style={styles.empty}>Henüz sözleşme eklenmemiş.</Text>
        ) : (
          pages.map((page, index) => (
            <Pressable
              key={page.slug}
              onPress={() => router.push(`/legal/${page.slug}` as RelativePathString)}
              style={[styles.row, index < pages.length - 1 && styles.rowBorder]}
            >
              <FileText color={t.brand} size={20} strokeWidth={2} />
              <Text style={styles.label}>{page.title}</Text>
              <ChevronRight color={t.inkSoft} size={20} />
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  err: { color: t.danger, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  card: {
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    ...t.shadow,
  },
  empty: { padding: 16, color: t.inkMuted, fontSize: 14, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: t.border },
  label: { flex: 1, color: t.ink, fontSize: 15, fontWeight: '600' },
});
