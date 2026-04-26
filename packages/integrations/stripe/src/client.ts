import Stripe from 'stripe';

export interface StripeClientOptions {
  apiKey: string;
  apiVersion?: Stripe.LatestApiVersion;
}

/**
 * Thin wrapper around the Stripe SDK so we own retries + telemetry.
 * Stripe's SDK already handles network retries, but we keep this layer
 * to attach idempotency keys consistently and to make the API
 * surface easy to mock in tests.
 */
export class StripeClient {
  readonly raw: Stripe;

  constructor(opts: StripeClientOptions) {
    this.raw = new Stripe(opts.apiKey, {
      apiVersion: opts.apiVersion ?? '2024-06-20',
      maxNetworkRetries: 2,
      typescript: true,
      appInfo: { name: 'ResolveAI', version: '1.0.0' },
    });
  }

  async createCustomer(input: {
    storeId: string;
    name: string;
    email?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    return this.raw.customers.create(
      {
        name: input.name,
        email: input.email,
        metadata: { storeId: input.storeId, ...input.metadata },
      },
      { idempotencyKey: `customer:${input.storeId}` },
    );
  }

  async createCheckoutSession(input: {
    storeId: string;
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
  }): Promise<Stripe.Checkout.Session> {
    return this.raw.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: input.customerId,
        line_items: [{ price: input.priceId, quantity: 1 }],
        subscription_data: input.trialDays
          ? { trial_period_days: input.trialDays }
          : undefined,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        allow_promotion_codes: true,
        metadata: { storeId: input.storeId },
      },
      { idempotencyKey: `checkout:${input.storeId}:${input.priceId}` },
    );
  }

  async createPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    return this.raw.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
  }

  /**
   * Report metered usage to Stripe. Uses the Meter Events API (the modern
   * replacement for `subscriptionItems.createUsageRecord`). The
   * `idempotencyKey` makes replays safe.
   */
  async reportMeterEvent(input: {
    eventName: string;
    customerId: string;
    quantity: number;
    timestamp?: Date;
    idempotencyKey: string;
  }): Promise<{ id: string }> {
    const ts = input.timestamp ?? new Date();
    const meterEvents = (this.raw as unknown as {
      billing: { meterEvents: { create: (params: Record<string, unknown>) => Promise<{ identifier?: string; id?: string }> } };
    }).billing.meterEvents;
    const created = await meterEvents.create({
      event_name: input.eventName,
      payload: {
        stripe_customer_id: input.customerId,
        value: String(input.quantity),
      },
      timestamp: Math.floor(ts.getTime() / 1000),
      identifier: input.idempotencyKey,
    });
    return { id: created.identifier ?? created.id ?? input.idempotencyKey };
  }

  verifyWebhook(payload: Buffer | string, signature: string, secret: string): Stripe.Event {
    return this.raw.webhooks.constructEvent(payload, signature, secret);
  }
}
