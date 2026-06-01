import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Calendar, Handshake } from 'lucide-react-native';
import { resolveMediaUrlForDevice } from '../../lib/api';
import {
  fetchPublicMarketingCampaign,
  formatCampaignDateRange,
  PHASE_LABEL,
  type PublicMarketingCampaignDetail,
} from '../../lib/marketing-campaigns';
import { customerTheme as t } from '../../lib/theme';

function wrapHtml(body: string) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 16px 16px 32px; color: #1a2230; background: #eef2f6; line-height: 1.55; font-size: 15px; }
  h1, h2, h3 { color: #0f172a; margin-top: 1.2em; }
  p { margin: 0.75em 0; }
  ul, ol { padding-left: 1.25em; }
  a { color: #16B24B; }
  strong { color: #0f172a; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
</style>
</head>
<body>${body || '<p>İçerik henüz eklenmemiş.</p>'}</body>
</html>`;
}

export default function CampaignDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const slugStr = typeof slug === 'string' ? slug : '';
  const navigation = useNavigation();
  const [campaign, setCampaign] = useState<PublicMarketingCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!slugStr) {
        setErr('Geçersiz kampanya');
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      setErr(null);
      void (async () => {
        try {
          const data = await fetchPublicMarketingCampaign(slugStr);
          if (!cancelled) {
            setCampaign(data);
            navigation.setOptions({ title: data.title });
          }
        } catch (e) {
          if (!cancelled) {
            setCampaign(null);
            setErr((e as Error).message);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [slugStr, navigation]),
  );

  const html = useMemo(() => wrapHtml(campaign?.contentHtml ?? ''), [campaign?.contentHtml]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  if (err || !campaign) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{err ?? 'Kampanya bulunamadı'}</Text>
      </View>
    );
  }

  const imageUri = resolveMediaUrlForDevice(campaign.imageUrl);
  const expired = campaign.phase === 'expired';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.headerBox} showsVerticalScrollIndicator={false}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.hero} resizeMode="cover" />
        ) : null}
        <View style={styles.meta}>
          <View
            style={[
              styles.phasePill,
              expired && styles.phaseExpired,
              campaign.phase === 'upcoming' && styles.phaseUpcoming,
            ]}
          >
            <Text
              style={[
                styles.phaseTxt,
                campaign.phase === 'upcoming' && styles.phaseTxtBrand,
                expired && styles.phaseTxtMuted,
              ]}
            >
              {PHASE_LABEL[campaign.phase]}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Calendar color={t.inkSoft} size={14} />
            <Text style={styles.dateTxt}>{formatCampaignDateRange(campaign.startsAt, campaign.endsAt)}</Text>
          </View>
        </View>
        {campaign.partnerLabel ? (
          <View style={styles.partnerRow}>
            <Handshake color={t.brand} size={16} strokeWidth={2} />
            <Text style={styles.partner}>{campaign.partnerLabel}</Text>
          </View>
        ) : null}
        <Text style={[styles.summary, expired && styles.muted]}>{campaign.summary}</Text>
      </ScrollView>
      <WebView
        originWhitelist={['about:blank']}
        source={{ html, baseUrl: 'about:blank' }}
        style={styles.web}
        javaScriptEnabled={false}
        allowsInlineMediaPlayback={false}
        showsVerticalScrollIndicator
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  headerBox: { paddingBottom: 8 },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { color: t.danger, fontSize: 15, textAlign: 'center' },
  hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: t.border },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  phasePill: { backgroundColor: t.brand, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  phaseUpcoming: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  phaseExpired: { backgroundColor: t.inkSoft },
  phaseTxt: { color: t.onBrand, fontSize: 11, fontWeight: '700' },
  phaseTxtBrand: { color: t.brand },
  phaseTxtMuted: { color: t.ink },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateTxt: { color: t.inkMuted, fontSize: 12 },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  partner: { color: t.brand, fontSize: 14, fontWeight: '700' },
  summary: { color: t.inkSecondary, fontSize: 16, lineHeight: 24, paddingHorizontal: 16, marginTop: 10 },
  muted: { color: t.inkMuted },
  web: { flex: 1, backgroundColor: 'transparent' },
});
