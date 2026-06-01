import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronRight, FileText } from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { apiGet, apiGetAuth } from '../../lib/api';
import {
  visibleLegalPages,
  type LegalPageSummary,
  type LegalPagesListResponse,
} from '../../lib/legal-pages';
import { customerTheme as t } from '../../lib/theme';

type Me = { type?: string | null };

export default function LegalIndexScreen() {
  const router = useRouter();
  const [pages, setPages] = useState<LegalPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [me, legal] = await Promise.all([
        apiGetAuth<Me>('/customer/me').catch(() => ({ type: null })),
        apiGet<LegalPagesListResponse>('/public/legal'),
      ]);
      setPages(visibleLegalPages(legal.pages, me.type));
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
      <GlassCard>
        {pages.length === 0 ? (
          <Text style={styles.empty}>Henüz sözleşme eklenmemiş.</Text>
        ) : (
          pages.map((page, index) => (
            <Pressable
              key={page.slug}
              onPress={() => router.push(`/legal/${page.slug}`)}
              style={[styles.row, index === pages.length - 1 && styles.rowLast]}
            >
              <View style={styles.iconWrap}>
                <FileText size={18} color={t.inkSecondary} strokeWidth={2.2} />
              </View>
              <Text style={styles.label}>{page.title}</Text>
              <ChevronRight color={t.inkSoft} size={20} />
            </Pressable>
          ))
        )}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  err: { color: t.danger, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  empty: { padding: 16, color: t.inkMuted, fontSize: 14, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: { width: 40, alignItems: 'center' },
  label: { flex: 1, marginLeft: 8, fontSize: 15, fontWeight: '600', color: t.ink },
});
