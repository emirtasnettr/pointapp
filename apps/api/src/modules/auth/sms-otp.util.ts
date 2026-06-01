import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const SMS_OTP_MAX_ATTEMPTS = 5;

export function assertOtpAttemptsNotExceeded(attempts: number): void {
  if (attempts >= SMS_OTP_MAX_ATTEMPTS) {
    throw new HttpException(
      'Çok fazla hatalı deneme. Lütfen yeni SMS kodu isteyin.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/** Geliştirmede varsayılan açık; production’da varsayılan kapalı. */
export function isSmsSimulationEnabled(config: ConfigService): boolean {
  const explicit = config.get<string>('POINT_SMS_SIMULATION');
  if (explicit === '0') return false;
  if (explicit === '1') return true;
  return config.get<string>('NODE_ENV') !== 'production';
}

export function smsSimulationPayload(
  config: ConfigService,
  code: string,
): { simulatedOtp?: string; simulationNotice?: string } {
  if (!isSmsSimulationEnabled(config)) return {};
  return {
    simulatedOtp: code,
    simulationNotice:
      'SMS simülasyonu etkin: Gerçek ortamda kod telefona gider; şimdilik yalnızca geliştirme ortamında gösterilir.',
  };
}
