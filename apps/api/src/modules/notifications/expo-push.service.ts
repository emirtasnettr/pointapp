import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly config: ConfigService) {}

  private isExpoPushToken(token: string): boolean {
    return /^Expo(nent)?PushToken\[.+\]$/.test(token) || /^ExponentPushToken\[.+\]$/.test(token);
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      out.push(items.slice(i, i + size));
    }
    return out;
  }

  async send(messages: ExpoPushMessage[]): Promise<{
    sent: number;
    skipped: number;
    errors: string[];
  }> {
    const valid = messages.filter((m) => m.to && this.isExpoPushToken(m.to));
    const skipped = messages.length - valid.length;
    if (valid.length === 0) {
      return { sent: 0, skipped, errors: [] };
    }

    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (accessToken?.trim()) {
      headers.Authorization = `Bearer ${accessToken.trim()}`;
    }

    const errors: string[] = [];
    let sent = 0;

    for (const batch of this.chunk(valid, 100)) {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(
          batch.map((m) => ({
            to: m.to,
            title: m.title,
            body: m.body,
            data: m.data,
            sound: m.sound ?? 'default',
          })),
        ),
      });

      if (!res.ok) {
        const text = await res.text();
        errors.push(`Expo API ${res.status}: ${text.slice(0, 200)}`);
        continue;
      }

      const json = (await res.json()) as { data?: ExpoPushTicket[] };
      const tickets = json.data ?? [];
      for (const ticket of tickets) {
        if (ticket.status === 'ok') sent += 1;
        else errors.push(ticket.message ?? ticket.details?.error ?? 'push error');
      }
    }

    if (errors.length) {
      this.logger.warn(`Expo push errors (${errors.length}): ${errors.slice(0, 3).join('; ')}`);
    }

    return { sent, skipped, errors };
  }
}
