import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';
import { OnboardingWizard } from './_components/wizard';

export const dynamic = 'force-dynamic';

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
  trialIncludedTickets: number;
}

interface OnboardingState {
  store: { id: string; name: string } | null;
  integrations: Record<string, string>;
  completedSteps: string[];
  knowledgeDocCount: number;
  ticketCount: number;
  automationPreset: 'conservative' | 'balanced' | 'aggressive' | null;
}

/**
 * 5-step onboarding wizard. Targets time-to-first-resolution under
 * 5 minutes by short-circuiting around already-installed integrations
 * and surfacing a synthetic "test ticket" at the end so the merchant
 * sees the AI replying live before leaving the wizard.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string };
}): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();

  let state: OnboardingState | null = null;
  let plans: PlansResponse | null = null;
  try {
    [state, plans] = await Promise.all([
      apiFetch<OnboardingState>('/onboarding/state', { storeId, userId }),
      apiFetch<PlansResponse>('/billing/plans', { storeId, userId }),
    ]);
  } catch (err) {
    console.error('Onboarding bootstrap failed', err);
  }

  if (!state || !plans) {
    return (
      <div className="mx-auto max-w-2xl p-12 text-center">
        <h1 className="text-2xl font-semibold">Setup is unavailable right now</h1>
        <p className="mt-3 text-muted-foreground">
          We couldn&apos;t reach the API. Please refresh, or sign in again.
        </p>
      </div>
    );
  }

  // Auto-skip when fully configured.
  if (state.completedSteps.length >= 5 && !searchParams.step) {
    redirect('/dashboard');
  }

  return <OnboardingWizard initialState={state} plans={plans} stepParam={searchParams.step} />;
}
