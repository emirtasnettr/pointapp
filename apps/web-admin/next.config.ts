import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@point/delivery-wizard'],
  eslint: { ignoreDuringBuilds: true },
  /**
   * Geliştirmede sayfayı `http://127.0.0.1:PORT` ile açınca `/_next/static/*` (CSS) istekleri
   * Origin uyuşmazlığında 403 yiyebiliyor; Tailwind/CSS hiç yüklenmez.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
