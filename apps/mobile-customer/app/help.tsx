import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Headphones, HelpCircle, MessageCircle, Package, Phone } from 'lucide-react-native';
import { GlassCard } from '../components/GlassCard';
import { customerTheme as t } from '../lib/theme';

const bullets = [
  { Icon: Package, text: 'Yeni teslimat oluştururken adres ve kişi bilgilerini eksiksiz doldurun.' },
  { Icon: MessageCircle, text: 'Teslimat numaranızı operasyon ekibine iletirken bu numarayı kullanın.' },
  { Icon: Phone, text: 'Acil durumlarda uygulama dışından operasyon hattınızı arayın (şirket içi süreç).' },
];

export default function HelpScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <HelpCircle color={t.brand} size={32} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>Nasıl kullanılır?</Text>
          <Text style={styles.lead}>
            Point müşteri uygulaması ile gönderilerinizi oluşturabilir, teslimatlarınızı takip edebilir ve hesap bilgilerinize
            ulaşabilirsiniz.
          </Text>
        </View>

        {bullets.map(({ Icon, text }, i) => (
          <GlassCard key={i} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Icon color={t.brand} size={22} strokeWidth={2.2} />
              </View>
              <Text style={styles.bullet}>{text}</Text>
            </View>
          </GlassCard>
        ))}

        <GlassCard style={styles.footerCard}>
          <View style={styles.row}>
            <Headphones color={t.inkSecondary} size={22} strokeWidth={2.2} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.footerTitle}>Destek</Text>
              <Text style={styles.footerTxt}>Kurumsal anlaşma ve faturalandırma için şirket yöneticinize başvurun.</Text>
            </View>
          </View>
        </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  pad: { padding: 16, paddingBottom: 40 },
  hero: { marginBottom: 16 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: t.brandMuted,
    borderWidth: 1,
    borderColor: t.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '900', color: t.ink },
  lead: { marginTop: 8, fontSize: 15, lineHeight: 22, color: t.inkSecondary, fontWeight: '500' },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: { width: 40, alignItems: 'center', paddingTop: 2 },
  bullet: { flex: 1, fontSize: 15, lineHeight: 22, color: t.ink, fontWeight: '600' },
  footerCard: { marginTop: 8 },
  footerTitle: { fontSize: 16, fontWeight: '800', color: t.ink },
  footerTxt: { marginTop: 6, fontSize: 14, lineHeight: 20, color: t.inkMuted },
});
