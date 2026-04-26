import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';
import { RulesEditor } from './_components/rules-editor';

export const dynamic = 'force-dynamic';

interface PolicyResponse {
  policy: {
    version: number;
    autoRefund: {
      enabled: boolean;
      maxAmountUsd: number;
      maxOrderAgeDays: number;
      allowedReasons: string[];
      requirePhotoFor: string[];
      blocklistCustomerFlags: string[];
    };
  };
}

export default async function SettingsRulesPage(): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();
  let initial: PolicyResponse['policy'] | null = null;
  try {
    const res = await apiFetch<PolicyResponse>('/settings/rules', { storeId, userId });
    initial = res.policy;
  } catch {
    initial = null;
  }

  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Rules</h1>
        <p className="text-muted-foreground">
          Decide when ResolveAI is allowed to auto-resolve refunds without human approval.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Auto-refund policy</CardTitle>
          <CardDescription>
            Refunds matching every condition below are issued automatically. Anything that fails a
            check is sent to the inbox for human review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initial ? <RulesEditor initial={initial} /> : <p>Could not load policy.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
