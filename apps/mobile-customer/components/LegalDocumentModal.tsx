import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { apiGet } from '../lib/api';
import { legalPageTitle, type LegalPageResponse } from '../lib/legal-pages';
import { customerTheme as t } from '../lib/theme';

function wrapHtml(body: string) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 16px 16px 32px; color: #1a2230; background: #fff; line-height: 1.55; font-size: 15px; }
  h1, h2, h3 { color: #0f172a; margin-top: 1.2em; }
  p { margin: 0.75em 0; }
  ul, ol { padding-left: 1.25em; }
  a { color: #16B24B; }
</style>
</head>
<body>${body || '<p>İçerik henüz eklenmemiş.</p>'}</body>
</html>`;
}

type Props = {
  slug: string | null;
  visible: boolean;
  onClose: () => void;
};

export function LegalDocumentModal({ slug, visible, onClose }: Props) {
  const [page, setPage] = useState<LegalPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (slugStr: string) => {
    setLoading(true);
    setErr(null);
    setPage(null);
    try {
      const data = await apiGet<LegalPageResponse>(`/public/legal/${encodeURIComponent(slugStr)}`);
      setPage(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible || !slug) return;
    void load(slug);
  }, [visible, slug, load]);

  const html = useMemo(() => wrapHtml(page?.html ?? ''), [page?.html]);
  const title = page?.title ?? (slug ? legalPageTitle(slug) : '');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeIcon} accessibilityLabel="Kapat">
            <X color={t.ink} size={22} strokeWidth={2.2} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.brand} size="large" />
          </View>
        ) : err ? (
          <View style={styles.center}>
            <Text style={styles.err}>{err}</Text>
          </View>
        ) : (
          <WebView originWhitelist={['*']} source={{ html }} style={styles.web} showsVerticalScrollIndicator />
        )}

        <View style={styles.footer}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnTxt}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
    backgroundColor: t.surface,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: t.ink },
  closeIcon: { padding: 4 },
  web: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  err: { textAlign: 'center', color: t.danger, fontSize: 14, fontWeight: '600' },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.border,
    backgroundColor: t.surface,
  },
  closeBtn: {
    backgroundColor: t.brand,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnTxt: { color: t.onBrand, fontWeight: '700', fontSize: 16 },
});
