import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@point/delivery-wizard'],
  eslint: { ignoreDuringBuilds: true },
  /** `http://127.0.0.1:*` ile dev açılışında CSS / _next static 403 olmasın. */
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
