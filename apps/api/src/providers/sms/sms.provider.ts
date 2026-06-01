export type SmsSendResult = { messageId: string; accepted: boolean };

export interface SmsProvider {
  sendOtp(phone: string, code: string, templateKey: string): Promise<SmsSendResult>;
}
