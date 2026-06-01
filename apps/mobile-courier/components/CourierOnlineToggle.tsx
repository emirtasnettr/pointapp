import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Wifi, WifiOff } from 'lucide-react-native';
import {
  fetchCourierAvailability,
  setCourierAvailability,
  type CourierAvailability,
} from '../lib/courier-availability';
import { courierTheme as t } from '../lib/theme';

type Props = {
  onChange?: (state: CourierAvailability) => void;
  compact?: boolean;
  /** Sekme odaklandığında yenile */
  refreshKey?: number;
};

export function CourierOnlineToggle({ onChange, compact, refreshKey }: Props) {
  const [state, setState] = useState<CourierAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const s = await fetchCourierAvailability();
      setState(s);
      onChange?.(s);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const toggle = useCallback(async () => {
    if (!state || busy || (!state.canGoOnline && !state.isOnline)) return;
    setBusy(true);
    setErr(null);
    try {
      const s = await setCourierAvailability(!state.isOnline);
      setState(s);
      onChange?.(s);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [state, busy, onChange]);

  if (loading && !state) {
    return (
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        <ActivityIndicator color={t.brand} />
      </View>
    );
  }

  if (!state) return null;

  const online = state.isOnline;
  const disabled = busy || (!state.canGoOnline && !online);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Pressable
        onPress={() => void toggle()}
        disabled={disabled}
        style={[
          styles.pill,
          online ? styles.pillOn : styles.pillOff,
          disabled && styles.pillDisabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={online ? '#fff' : t.brand} size="small" />
        ) : online ? (
          <Wifi color="#fff" size={18} />
        ) : (
          <WifiOff color={t.inkMuted} size={18} />
        )}
        <Text style={[styles.pillText, online && styles.pillTextOn]}>
          {online ? 'Çevrimiçi' : 'Çevrimdışı'}
        </Text>
      </Pressable>
      {!compact ? (
        <Text style={styles.hint}>
          {online
            ? 'Havuzdaki paketleri görebilir ve iş alabilirsiniz.'
            : state.canGoOnline
              ? 'Çevrimdışıyken havuz görünmez.'
              : 'Hesap onayından sonra çevrimiçi olabilirsiniz.'}
        </Text>
      ) : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    gap: 8,
  },
  wrapCompact: { marginBottom: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillOn: {
    backgroundColor: t.brand,
    borderColor: t.brand,
  },
  pillOff: {
    backgroundColor: t.surface,
    borderColor: t.border,
  },
  pillDisabled: { opacity: 0.55 },
  pillText: { fontSize: 15, fontWeight: '700', color: t.ink },
  pillTextOn: { color: '#fff' },
  hint: { fontSize: 13, lineHeight: 18, color: t.muted },
  err: { fontSize: 12, color: '#b91c1c' },
});
