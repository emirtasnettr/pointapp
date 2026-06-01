import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import { apiGet } from '../../lib/api';
import { legalPageTitle, type LegalPageResponse } from '../../lib/legal-pages';
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
</style>
</head>
<body>${body || '<p>İçerik henüz eklenmemiş.</p>'}</body>
</html>`;
}

export default function LegalPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const slugStr = typeof slug === 'string' ? slug : '';
  const [page, setPage] = useState<LegalPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!slugStr) {
        setErr('Geçersiz sayfa');
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      setErr(null);
      void (async () => {
        try {
          const data = await apiGet<LegalPageResponse>(`/public/legal/${encodeURIComponent(slugStr)}`);
          if (!cancelled) setPage(data);
        } catch (e) {
          if (!cancelled) {
            setPage(null);
            setErr((e as Error).message);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [slugStr]),
  );

  const html = useMemo(() => wrapHtml(page?.html ?? ''), [page?.html]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} size="large" />
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{err}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        originWhitelist={['about:blank']}
        source={{ html, baseUrl: 'about:blank' }}
        style={styles.web}
        javaScriptEnabled={false}
        showsVerticalScrollIndicator
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  web: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { textAlign: 'center', color: t.danger, fontSize: 14, fontWeight: '600' },
});
