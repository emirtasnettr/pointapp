import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Fingerprint, Mail, Phone, UserRound } from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { apiGetAuth } from '../../lib/api';
import { customerTheme as t } from '../../lib/theme';

type Me = {
  customerPublicId: string;
  email?: string | null;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
};

export default function ProfileScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        try {
          const data = await apiGetAuth<Me>('/customer/me');
          if (!cancelled) setMe(data);
        } catch {
          if (!cancelled) setMe(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  const name =
    me?.firstName || me?.lastName ? [me.firstName, me.lastName].filter(Boolean).join(' ') : '—';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <UserRound color={t.onBrand} size={32} strokeWidth={2} />
        </View>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.idChip}>
          <Fingerprint size={14} color={t.brand} strokeWidth={2.2} />
          <Text style={styles.idChipTxt}>{me?.customerPublicId ?? '—'}</Text>
        </View>
      </View>

      <GlassCard>
        <Row icon={Mail} label="E-posta" value={me?.email ?? '—'} />
        <Row icon={Phone} label="Telefon" value={me?.phone ?? '—'} mono last />
      </GlassCard>
    </ScrollView>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
  last,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <Icon size={18} color={t.brand} strokeWidth={2.2} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLab}>{label}</Text>
        <Text style={[styles.rowVal, mono && styles.mono]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: t.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow,
  },
  name: { marginTop: 12, fontSize: 20, fontWeight: '700', color: t.ink },
  idChip: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  idChipTxt: { fontSize: 13, fontWeight: '700', color: t.brand, fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 40, alignItems: 'center', paddingTop: 2 },
  rowBody: { flex: 1 },
  rowLab: { fontSize: 12, fontWeight: '700', color: t.inkMuted },
  rowVal: { marginTop: 4, fontSize: 16, fontWeight: '700', color: t.ink },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
});
