import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect, type RelativePathString } from 'expo-router';
import { fetchCourierMe } from '../lib/courier-me';
import { COURIER_EARNING_VAT_NOTE, formatDeliveryEarning } from '../lib/delivery-list-helpers';
import {
  formatPayoutMoney,
  parsePayoutAmount,
  payoutInvoiceGrossFromNet,
  PAYOUT_INVOICE_VAT_RATE,
} from '../lib/payout-invoice-vat';
import {
  createCourierPayoutRequest,
  fetchCourierPayoutRequests,
  type PayoutInvoicePick,
} from '../lib/courier-payout';
import {
  normalizePayoutInvoiceMime,
  payoutInvoiceLabel,
  PAYOUT_INVOICE_MAX_BYTES,
} from '../lib/payout-invoice';
import { courierTheme as t } from '../lib/theme';

export default function PayoutRequestScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState<string | null>(null);
  const [currency, setCurrency] = useState('TRY');
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<PayoutInvoicePick | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [me, pr] = await Promise.all([fetchCourierMe(), fetchCourierPayoutRequests()]);
      setBalance(me.wallet?.balance ?? '0');
      setCurrency(me.wallet?.currency ?? 'TRY');

      const open = pr.items.find((p) => p.status === 'PENDING' || p.status === 'APPROVED');
      if (open) {
        setBlocked('İncelenen veya onaylanmış bir ödeme talebiniz var. Yeni talep için sonucu bekleyin.');
        return;
      }
      if (me.delivered.count < 1) {
        setBlocked('Ödeme talebi için en az bir teslimat tamamlamalısınız.');
        return;
      }
      setBlocked(null);
    } catch (e) {
      setBlocked((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const balanceNum = balance != null ? Number(String(balance).replace(',', '.')) : NaN;
  const requestedNet = parsePayoutAmount(amountText);
  const invoiceGross = requestedNet != null ? payoutInvoiceGrossFromNet(requestedNet) : null;

  const pickInvoice = useCallback(async () => {
    setErr(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const name = asset.name?.trim() || 'fatura';
      const mimeType = normalizePayoutInvoiceMime(asset.mimeType, name);
      if (!mimeType) {
        setErr('Yalnızca PNG, JPG, JPEG veya PDF yükleyebilirsiniz.');
        return;
      }
      if (asset.size != null && asset.size > PAYOUT_INVOICE_MAX_BYTES) {
        setErr('Fatura dosyası en fazla 40 MB olabilir.');
        return;
      }
      setInvoiceFile({ uri: asset.uri, name, mimeType });
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (blocked) return;
    const raw = amountText.trim().replace(',', '.');
    const n = Number(raw);
    if (!raw || Number.isNaN(n) || n <= 0) {
      setErr('Geçerli bir tutar girin.');
      return;
    }
    if (!Number.isNaN(balanceNum) && n > balanceNum) {
      setErr('Tutar bakiyeden fazla olamaz.');
      return;
    }
    if (!invoiceFile) {
      setErr('Ödeme talebi için fatura yüklemeniz gerekir.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await createCourierPayoutRequest({
        amount: raw,
        invoice: invoiceFile,
      });
      Alert.alert('Talep gönderildi', 'Ödeme talebiniz incelenmek üzere alındı.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [amountText, balanceNum, invoiceFile, blocked, router]);

  return (
    <ScrollView
      contentContainerStyle={styles.box}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {loading ? (
        <ActivityIndicator color={t.brand} style={styles.loader} />
      ) : blocked ? (
        <View style={styles.blockCard}>
          <Text style={styles.blockTxt}>{blocked}</Text>
          <Pressable style={styles.retry} onPress={() => router.back()}>
            <Text style={styles.retryTxt}>Geri dön</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {balance != null ? (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLbl}>Çekilebilir bakiye ({COURIER_EARNING_VAT_NOTE})</Text>
              <Text style={styles.balanceVal}>
                {formatDeliveryEarning(balance)} {currency}
              </Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <Text style={styles.fieldLbl}>Tutar — {COURIER_EARNING_VAT_NOTE} (₺)</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn. 500"
              placeholderTextColor={t.inkMuted}
              keyboardType="decimal-pad"
              value={amountText}
              onChangeText={setAmountText}
              editable={!submitting}
            />

            <Text style={[styles.fieldLbl, styles.fieldLblSpaced]}>Fatura (zorunlu)</Text>
            <Pressable
              style={styles.invoicePickBtn}
              onPress={() => void pickInvoice()}
              disabled={submitting}
            >
              <Text style={styles.invoicePickBtnTxt}>
                {invoiceFile ? 'Faturayı değiştir' : 'Fatura seç (PNG, JPG, PDF)'}
              </Text>
            </Pressable>
            {invoiceFile ? (
              <Text style={styles.invoiceFileName} numberOfLines={2}>
                {invoiceFile.name} · {payoutInvoiceLabel(invoiceFile.mimeType)}
              </Text>
            ) : (
              <Text style={styles.formHint}>En fazla 40 MB.</Text>
            )}

            {err ? <Text style={styles.err}>{err}</Text> : null}

            {invoiceGross != null ? (
              <View style={styles.invoiceGrossCard}>
                <Text style={styles.invoiceGrossLbl}>KDV dahil kesmeniz gereken tutar (fatura)</Text>
                <Text style={styles.invoiceGrossVal}>{formatPayoutMoney(invoiceGross)} ₺</Text>
                <Text style={styles.invoiceGrossHint}>
                  Talep tutarınız {formatPayoutMoney(requestedNet)} ₺ ({COURIER_EARNING_VAT_NOTE}). Faturanızda
                  %{Math.round(PAYOUT_INVOICE_VAT_RATE * 100)} KDV ile toplam bu tutar yer almalıdır.
                </Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.submitBtn, (submitting || !invoiceFile) && styles.submitBtnDisabled]}
              onPress={() => void onSubmit()}
              disabled={submitting || !invoiceFile}
            >
              {submitting ? (
                <ActivityIndicator color={t.onBrand} />
              ) : (
                <Text style={styles.submitBtnTxt}>Talebi gönder</Text>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.taxLinkBtn} onPress={() => router.push('/company-tax')}>
            <Text style={styles.taxLinkBtnTxt}>Faturamı kime keseceğim?</Text>
          </Pressable>
          <Pressable
            style={[styles.taxLinkBtn, styles.taxLinkBtnFollow]}
            onPress={() => router.push('/legal/payout-payment-days' as RelativePathString)}
          >
            <Text style={styles.taxLinkBtnTxt}>Hangi günler ödeme alabilirim?</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, paddingBottom: 40, backgroundColor: t.bg },
  loader: { marginTop: 40 },
  balanceCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.brandBorder,
    backgroundColor: t.brandMuted,
  },
  balanceLbl: { color: t.inkMuted, fontSize: 12, fontWeight: '700' },
  balanceVal: { color: t.brand, fontSize: 22, fontWeight: '800', marginTop: 6 },
  formCard: {
    padding: 16,
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    ...t.shadow,
  },
  fieldLbl: { color: t.inkMuted, fontSize: 12, fontWeight: '700' },
  fieldLblSpaced: { marginTop: 14 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: t.ink,
    backgroundColor: t.bg,
  },
  formHint: { color: t.inkMuted, fontSize: 11, marginTop: 10, lineHeight: 16 },
  invoicePickBtn: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: t.radiusSm,
    borderWidth: 1,
    borderColor: t.brandBorder,
    backgroundColor: t.brandMuted,
    alignItems: 'center',
  },
  invoicePickBtnTxt: { color: t.brand, fontSize: 14, fontWeight: '700' },
  invoiceFileName: { color: t.inkSecondary, fontSize: 12, marginTop: 6, lineHeight: 17 },
  err: { color: t.danger, fontSize: 13, marginTop: 12, lineHeight: 18 },
  invoiceGrossCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: t.radiusMd,
    borderWidth: 1,
    borderColor: t.brandBorder,
    backgroundColor: t.brandMuted,
  },
  invoiceGrossLbl: { color: t.inkSecondary, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  invoiceGrossVal: { color: t.brand, fontSize: 22, fontWeight: '800', marginTop: 6 },
  invoiceGrossHint: { color: t.inkMuted, fontSize: 11, marginTop: 8, lineHeight: 16 },
  submitBtn: {
    marginTop: 16,
    backgroundColor: t.brand,
    paddingVertical: 14,
    borderRadius: t.radiusMd,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.75 },
  submitBtnTxt: { color: t.onBrand, fontWeight: '800', fontSize: 16 },
  taxLinkBtn: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: t.radiusMd,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    alignItems: 'center',
  },
  taxLinkBtnFollow: { marginTop: 10 },
  taxLinkBtnTxt: { color: t.brand, fontSize: 15, fontWeight: '700' },
  blockCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  blockTxt: { color: t.inkSecondary, fontSize: 15, lineHeight: 22 },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: t.radiusMd,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
  },
  retryTxt: { color: t.brand, fontWeight: '700' },
});
