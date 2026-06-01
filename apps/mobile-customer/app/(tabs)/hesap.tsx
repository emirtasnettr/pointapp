import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  Bell,
  ChevronRight,
  FileText,
  LogOut,
  MapPinned,
  Megaphone,
  UserRound,
} from 'lucide-react-native';
import { clearCustomerSession } from '../../lib/session';
import { customerTheme as t } from '../../lib/theme';

export default function HesapTab() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await clearCustomerSession();
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.box}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Pressable style={styles.menuRow} onPress={() => router.push('/account/profile')}>
          <UserRound color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Profil bilgileri</Text>
            <Text style={styles.menuHint}>Kayıtlı bilgilerinizi görüntüleyin</Text>
          </View>
          <ChevronRight color={t.inkSoft} size={20} />
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable style={styles.menuRow} onPress={() => router.push('/(tabs)/addresses')}>
          <MapPinned color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Adreslerim</Text>
            <Text style={styles.menuHint}>Sık kullandığınız adresler</Text>
          </View>
          <ChevronRight color={t.inkSoft} size={20} />
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable style={styles.menuRow} onPress={() => router.push('/campaigns')}>
          <Megaphone color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Kampanyalar</Text>
            <Text style={styles.menuHint}>İndirimler ve duyurular</Text>
          </View>
          <ChevronRight color={t.inkSoft} size={20} />
        </Pressable>
        <View style={styles.menuDivider} />
        <Pressable style={styles.menuRow} onPress={() => router.push('/invoices' as never)}>
          <FileText color={t.brand} size={20} strokeWidth={2} />
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Faturalarım</Text>
            <Text style={styles.menuHint}>Yüklenen ve hazırlanan faturalar</Text>
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
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.row}>Sürüm</Text>
          <Text style={styles.rowStrong}>{Constants.expoConfig?.version ?? '—'}</Text>
        </View>
        <Text style={styles.rowMuted}>Point Müşteri</Text>
      </View>

      <Text style={styles.sectionTitle}>Yardım</Text>
      <View style={styles.card}>
        <Text style={styles.rowMuted}>
          Sipariş, teslimat veya hesabınızla ilgili sorularınız için destek ekibimize ulaşın.
        </Text>
        <Pressable style={styles.supportBtn} onPress={() => router.push('/help')}>
          <Text style={styles.supportBtnTxt}>Yardım & ipuçları</Text>
        </Pressable>
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
  screen: { flex: 1, backgroundColor: t.bg },
  box: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
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
  logout: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: t.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    paddingVertical: 16,
    borderRadius: t.radiusMd,
  },
  logoutTxt: { color: t.danger, fontWeight: '800', fontSize: 16 },
});
