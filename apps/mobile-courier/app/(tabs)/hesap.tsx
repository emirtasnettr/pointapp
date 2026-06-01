import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { LogOut, Landmark, UserRound, FileText, ChevronRight, Phone, Receipt, Bell } from 'lucide-react-native';
import { CourierOnlineToggle } from '../../components/CourierOnlineToggle';
import { setCourierAvailability } from '../../lib/courier-availability';
import { fetchCourierSupportLine, telHref } from '../../lib/courier-support';
import { clearCourierSession } from '../../lib/session';
import { courierTheme as t } from '../../lib/theme';

export default function HesapTab() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [supportPhone, setSupportPhone] = useState<string | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);

  const load = useCallback(async () => {
    setSupportLoading(true);
    try {
      const support = await fetchCourierSupportLine();
      setSupportPhone(support.supportLinePhone);
    } catch {
      setSupportPhone(null);
    } finally {
      setSupportLoading(false);
    }
  }, []);

  const callSupport = useCallback(() => {
    if (!supportPhone) return;
    void Linking.openURL(telHref(supportPhone)).catch(() => {
      Alert.alert('Arama başlatılamadı', 'Cihazınız telefon aramasını desteklemiyor olabilir.');
    });
  }, [supportPhone]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await setCourierAvailability(false).catch(() => undefined);
      await clearCourierSession();
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <ScrollView contentContainerStyle={styles.box} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, styles.onlineCard]}>
        <Text style={styles.onlineCardTitle}>Müsaitlik</Text>
        <CourierOnlineToggle compact />
      </View>

      <View style={styles.card}>
        <Pressable style={styles.menuRow} onPress={() => router.push('/profile')}>
          <UserRound color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Profil bilgileri</Text>
            <Text style={styles.menuHint}>Kayıtlı bilgilerinizi görüntüleyin</Text>
          </View>
          <ChevronRight color={t.inkSoft} size={20} />
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable style={styles.menuRow} onPress={() => router.push('/bank')}>
          <Landmark color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Banka bilgileri</Text>
            <Text style={styles.menuHint}>IBAN görüntüle ve düzenle</Text>
          </View>
          <ChevronRight color={t.inkSoft} size={20} />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Ayarlar</Text>
      <View style={styles.card}>
        <Pressable style={styles.menuRow} onPress={() => router.push('/account/notifications')}>
          <Bell color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Bildirimler</Text>
            <Text style={styles.menuHint}>Açma ve kapama</Text>
          </View>
          <ChevronRight color={t.inkSoft} size={20} />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Uygulama</Text>
      <View style={styles.card}>
        <Pressable style={styles.menuRow} onPress={() => router.push('/legal')}>
          <FileText color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Bilgi ve sözleşmeler</Text>
          </View>
          <ChevronRight color={t.inkSoft} size={20} />
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable style={styles.menuRow} onPress={() => router.push('/company-tax')}>
          <Receipt color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Point vergi bilgileri</Text>
          </View>
          <ChevronRight color={t.inkSoft} size={20} />
        </Pressable>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.row}>Sürüm</Text>
          <Text style={styles.rowStrong}>{Constants.expoConfig?.version ?? '—'}</Text>
        </View>
        <Text style={styles.rowMuted}>Point Kurye</Text>
      </View>

      <Text style={styles.sectionTitle}>Yardım</Text>
      <View style={styles.card}>
        <Text style={styles.rowMuted}>
          Teslimat, ücret veya hesap sorunlarında operasyon ekibiyle iletişime geçin.
        </Text>
        {supportLoading ? (
          <ActivityIndicator color={t.brand} style={styles.supportLoader} />
        ) : supportPhone ? (
          <Pressable style={styles.supportBtn} onPress={callSupport}>
            <Phone color={t.onBrand} size={18} />
            <Text style={styles.supportBtnTxt}>Destek Hattına Bağlan</Text>
          </Pressable>
        ) : (
          <Text style={styles.supportMissing}>
            Destek hattı tanımlı değil. Operasyon ile iletişime geçin.
          </Text>
        )}
      </View>

      <Pressable style={styles.logout} onPress={() => void logout()} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={t.danger} />
        ) : (
          <>
            <LogOut color={t.danger} size={20} />
            <Text style={styles.logoutTxt}>Çıkış yap</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100, backgroundColor: t.bg },
  onlineCard: { marginBottom: 12 },
  onlineCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: t.ink,
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    color: t.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    padding: 16,
    borderRadius: t.radiusLg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    ...t.shadow,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  menuText: { flex: 1 },
  menuLabel: { color: t.ink, fontSize: 15, fontWeight: '600' },
  menuHint: { color: t.inkMuted, fontSize: 12, marginTop: 2 },
  menuDivider: {
    height: 1,
    backgroundColor: t.border,
    marginVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: t.border,
    marginVertical: 14,
  },
  row: { color: t.inkSecondary, fontSize: 15 },
  rowStrong: { color: t.ink, fontSize: 15, fontWeight: '700' },
  rowMuted: { color: t.inkMuted, fontSize: 14, lineHeight: 21 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supportLoader: { marginTop: 16 },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: t.radiusMd,
    backgroundColor: t.brand,
  },
  supportBtnTxt: { color: t.onBrand, fontSize: 15, fontWeight: '800' },
  supportMissing: {
    marginTop: 14,
    color: t.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  logout: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: t.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    paddingVertical: 16,
    borderRadius: t.radiusMd,
  },
  logoutTxt: { color: t.danger, fontWeight: '800', fontSize: 16 },
});
