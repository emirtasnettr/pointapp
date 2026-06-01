const DEV_JWT_PLACEHOLDER = 'point-dev-jwt-change-me';

export function validateEnvOnBootstrap(): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  const jwt = process.env.JWT_SECRET?.trim();
  if (isProd && (!jwt || jwt === DEV_JWT_PLACEHOLDER || jwt.length < 32)) {
    throw new Error(
      'JWT_SECRET production ortamında en az 32 karakterlik güçlü bir değer olmalıdır.',
    );
  }

  if (isProd) {
    const cors =
      process.env.CORS_ORIGINS?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    if (cors.length === 0) {
      throw new Error('CORS_ORIGINS production ortamında zorunludur (virgülle ayrılmış origin listesi).');
    }
  }

  if (isProd && process.env.POINT_SMS_SIMULATION === '1') {
    // eslint-disable-next-line no-console
    console.warn(
      '[security] POINT_SMS_SIMULATION=1 — canlıda gerçek SMS kullanılmıyor; yalnızca bilinçli test için bırakın.',
    );
  }
}
