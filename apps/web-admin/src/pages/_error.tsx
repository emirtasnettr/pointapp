import type { NextPageContext } from 'next';

type Props = { statusCode?: number };

/**
 * Geliştirmede Next bazen `/_error` (Pages router) bileşenini arar; yalnızca `app/` varken
 * "missing required error components" uyarısını engellemek için minimal sayfa.
 */
export default function LegacyErrorPage({ statusCode }: Props) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#f4f4f5',
        padding: 32,
        color: '#18181b',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, color: '#16B24B' }}>Point Yönetim</p>
      <h1 style={{ marginTop: 8, fontSize: 20, fontWeight: 600 }}>Sunucu hatası</h1>
      <p style={{ marginTop: 8, fontSize: 14, color: '#52525b' }}>
        {statusCode ? `HTTP ${statusCode}` : 'Beklenmeyen bir hata oluştu.'}
      </p>
    </div>
  );
}

LegacyErrorPage.getInitialProps = ({ res, err }: NextPageContext): Props => {
  const statusCode =
    res?.statusCode ??
    (err && typeof err === 'object' && err && 'statusCode' in err ? (err as { statusCode?: number }).statusCode : undefined) ??
    500;
  return { statusCode };
};
