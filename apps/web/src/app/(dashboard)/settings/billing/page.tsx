import { apiFetch } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';
import { BillingPanel } from './_components/billing-panel';

export const dynamic = 'force-dynamic';

interface Subscription {
  tier: string;
  status: string;
  enforcement: 'HARD' | 'SOFT';
  includedTickets: number;
  ticketsUsedCurrentPeriod: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

interface PlansResponse {
  plans: Array<{
    tier: 'STARTER' | 'GROWTH' | 'SCALE';
    name: string;
    description: string;
    priceMonthlyUsd: number;
    includedTickets: number;
    features: string[];
    priceId: string | null;
  }>;
  trialDays: number;
}

export default async function BillingPage(): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();

  let subscription: Subscription | null = null;
  let plans: PlansResponse = { plans: [], trialDays: 14 };
  try {
    const [subRes, plansRes] = await Promise.all([
      apiFetch<{ subscription: Subscription | null }>('/billing/subscription', {
        storeId,
        userId,
      }),
      apiFetch<PlansResponse>('/billing/plans', { storeId, userId }),
    ]);
    subscription = subRes.subscription;
    plans = plansRes;
  } catch (err) {
    console.error('Billing page bootstrap failed', err);
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your plan, see usage, and update your payment method.
        </p>
      </header>
      <BillingPanel subscription={subscription} plans={plans} />
    </div>
  );
}
