import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, Receipt } from 'lucide-react-native';
import {
  COMPANY_TAX_FIELDS,
  fetchCompanyTaxInfo,
  type CompanyTaxInfo,
} from '../lib/courier-company-tax';
import { courierTheme as t } from '../lib/theme';

function CopyRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const display = value.trim() || '—';
  const canCopy = Boolean(value.trim());

  const onCopy = useCallback(async () => {
    if (!canCopy) {
      Alert.alert('Kopyalanamadı', 'Bu alan henüz doldurulmamış.');
      return;
    }
    await Clipboard.setStringAsync(value.trim());
    Alert.alert('Kopyalandı', `${label} panoya kopyalandı.`);
  }, [canCopy, label, value]);

  return (
    <Pressable
      style={[styles.row, !canCopy && styles.rowDisabled]}
      onPress={() => void onCopy()}
      disabled={!canCopy}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, multiline && styles.rowValueMultiline]} selectable>
          {display}
        </Text>
      </View>
      <View style={[styles.copyBtn, !canCopy && styles.copyBtnDisabled]}>
        <Copy color={canCopy ? t.brand : t.inkSoft} size={18} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

export default function CompanyTaxScreen() {
  const [info, setInfo] = useState<CompanyTaxInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      setInfo(await fetchCompanyTaxInfo());
    } catch (e) {
      setInfo(null);
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

  return (
    <ScrollView contentContainerStyle={styles.box} showsVerticalScrollIndicator={false}>
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Receipt color={t.brand} size={22} strokeWidth={2} />
        </View>
        <Text style={styles.introTitle}>Önemli Bilgilendirme</Text>
        <Text style={styles.introTxt}>
          Ödeme alabilmeniz için aşağıdaki bilgiler doğrultusunda bize fatura kesmeniz gerekmektedir.
          Bilgileri eksiksiz girdiğinize emin olun. Hatalı faturalarda talebiniz reddedilecektir.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={t.brand} style={styles.loader} />
      ) : err ? (
        <View style={styles.card}>
          <Text style={styles.err}>{err}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryTxt}>Yenile</Text>
          </Pressable>
        </View>
      ) : info ? (
        <View style={styles.card}>
          {COMPANY_TAX_FIELDS.map((f, index) => (
            <View key={f.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <CopyRow
                label={f.label}
                value={info[f.key]}
                multiline={f.key === 'address'}
              />
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, paddingBottom: 40, backgroundColor: t.bg },
  intro: {
    marginBottom: 14,
    padding: 14,
    borderRadius: t.radiusLg,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  introTitle: { color: t.ink, fontSize: 15, fontWeight: '800' },
  introTxt: { color: t.inkSecondary, fontSize: 13, lineHeight: 20, marginTop: 8 },
  loader: { marginTop: 24 },
  card: {
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    padding: 4,
    ...t.shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rowDisabled: { opacity: 0.65 },
  rowText: { flex: 1 },
  rowLabel: { color: t.inkMuted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  rowValue: { color: t.ink, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  rowValueMultiline: { lineHeight: 22 },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  copyBtnDisabled: {
    backgroundColor: t.surfaceMuted,
    borderColor: t.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.border,
    marginHorizontal: 12,
  },
  err: { color: t.danger, fontSize: 14, lineHeight: 20, padding: 12 },
  retry: {
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: t.radiusMd,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  retryTxt: { color: t.brand, fontWeight: '700' },
});
