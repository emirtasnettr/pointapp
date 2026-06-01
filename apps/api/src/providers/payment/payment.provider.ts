export type PaymentIntent = {
  id: string;
  clientToken?: string;
  redirectUrl?: string;
  status: 'requires_action' | 'authorized' | 'failed';
};

export interface PaymentProvider {
  createIntent(input: {
    amount: string;
    currency: string;
    customerRef: string;
    deliveryId: string;
  }): Promise<PaymentIntent>;
  capture(intentId: string, amount: string): Promise<{ status: string }>;
}
