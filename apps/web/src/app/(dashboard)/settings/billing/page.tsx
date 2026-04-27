import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
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
    <>
      <SiteHeader title="Billing" />

      <PageHeader
        eyebrow="Billing"
        title="Plan & usage"
        description="Manage your plan, see usage and update your payment method."
        actions={
          subscription ? (
            <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
              <CreditCard className="size-3.5" />
              {subscription.tier} · {subscription.status.toLowerCase()}
            </Badge>
          ) : null
        }
      />

      <div className="px-6 py-6 lg:px-10 lg:py-8">
        <BillingPanel subscription={subscription} plans={plans} />
      </div>
    </>
  );
}
