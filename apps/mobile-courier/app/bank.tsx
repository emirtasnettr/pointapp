import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Landmark } from 'lucide-react-native';
import type { CourierBankInfo } from '../lib/courier-bank';
import { fetchCourierBank, formatIbanInput, patchCourierBank } from '../lib/courier-bank';
import { courierTheme as t } from '../lib/theme';

export default function BankScreen() {
  const [bank, setBank] = useState<CourierBankInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ibanInput, setIbanInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const b = await fetchCourierBank();
      setBank(b);
      setIbanInput(formatIbanInput(b.iban));
    } catch (e) {
      setBank(null);
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const raw = ibanInput.replace(/\s/g, '');
      const updated = await patchCourierBank(raw);
      setBank(updated);
      setIbanInput(formatIbanInput(updated.iban));
      Alert.alert('Kaydedildi', 'Banka bilgileriniz güncellendi.');
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [ibanInput]);

  return (
    <ScrollView contentContainerStyle={styles.box} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.header}>
          <Landmark color={t.brand} size={22} />
          <Text style={styles.title}>Ödeme hesabı</Text>
        </View>
        <Text style={styles.hint}>
          Hesap sahibi adı soyadı, sistemde kayıtlı bilgilerinizle aynı olmalıdır. Ad ve soyad yalnızca
          operasyon tarafından güncellenir; IBAN’ı siz girebilirsiniz.
        </Text>

        {loading ? (
          <ActivityIndicator color={t.brand} style={{ marginVertical: 12 }} />
        ) : err ? (
          <>
            <Text style={styles.muted}>{err}</Text>
            <Pressable style={styles.retry} onPress={() => void load()}>
              <Text style={styles.retryTxt}>Yenile</Text>
            </Pressable>
          </>
        ) : bank ? (
          <>
            <Text style={styles.fieldLabel}>Ad (sistem)</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyTxt}>{bank.firstName || '—'}</Text>
            </View>
            <Text style={styles.fieldLabel}>Soyad (sistem)</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyTxt}>{bank.lastName || '—'}</Text>
            </View>
            <Text style={styles.fieldLabel}>IBAN</Text>
            <TextInput
              style={styles.ibanInput}
              value={ibanInput}
              onChangeText={(v) => {
                const u = v.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase();
                setIbanInput(u);
              }}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              placeholderTextColor={t.inkSoft}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={42}
            />
            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={() => void save()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={t.onBrand} />
              ) : (
                <Text style={styles.saveBtnTxt}>IBAN kaydet</Text>
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { padding: 20, paddingBottom: 40, backgroundColor: t.bg },
  card: {
    padding: 16,
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    ...t.shadow,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  title: { color: t.ink, fontSize: 17, fontWeight: '800' },
  hint: { color: t.inkMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  fieldLabel: { color: t.inkSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  readonlyBox: {
    backgroundColor: t.surfaceMuted,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusMd,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  readonlyTxt: { color: t.inkSecondary, fontSize: 16, fontWeight: '600' },
  ibanInput: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusMd,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: t.ink,
    backgroundColor: t.surface,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: t.brand,
    paddingVertical: 14,
    borderRadius: t.radiusMd,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.75 },
  saveBtnTxt: { color: t.onBrand, fontWeight: '800', fontSize: 16 },
  muted: { color: t.inkMuted, fontSize: 14, lineHeight: 21 },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: t.radiusMd,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  retryTxt: { color: t.brand, fontWeight: '700' },
});
