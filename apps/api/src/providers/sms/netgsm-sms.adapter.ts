import type { SmsProvider, SmsSendResult } from './sms.provider';

/** NETGSM adapter iskeleti — gerçek HTTP çağrısı burada kalır. */
export class NetgsmSmsAdapter implements SmsProvider {
  constructor(
    private readonly userCode: string,
    private readonly password: string,
    private readonly header: string,
  ) {}

  async sendOtp(phone: string, code: string, templateKey: string): Promise<SmsSendResult> {
    void phone;
    void code;
    void templateKey;
    void this.userCode;
    void this.password;
    void this.header;
    return { messageId: 'stub', accepted: true };
  }
}
