import { ConfigService } from '@nestjs/config';

const DEV_JWT_PLACEHOLDER = 'point-dev-jwt-change-me';

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  const isProd = config.get<string>('NODE_ENV') === 'production';

  if (isProd) {
    if (!secret || secret === DEV_JWT_PLACEHOLDER || secret.length < 32) {
      throw new Error('JWT_SECRET geçersiz veya zayıf');
    }
    return secret;
  }

  return secret || DEV_JWT_PLACEHOLDER;
}
