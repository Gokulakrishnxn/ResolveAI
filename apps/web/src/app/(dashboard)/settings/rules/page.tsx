import { ScrollText, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <>
      <SiteHeader title="Rules" />

      <PageHeader
        eyebrow="Automation"
        title="Rules"
        description="Decide when ResolveAI is allowed to auto-resolve refunds without a human in the loop."
        actions={
          initial ? (
            <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
              <ScrollText className="size-3.5" />
              Policy v{initial.version}
            </Badge>
          ) : null
        }
      />

      <div className="px-6 py-6 lg:px-10 lg:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/60 pb-5">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-secondary/40">
                  <ShieldCheck className="size-5 text-foreground/80" />
                </div>
                <div className="space-y-1">
                  <CardTitle>Auto-refund policy</CardTitle>
                  <CardDescription>
                    Refunds matching every condition are issued automatically. Anything that fails
                    a check is sent to the inbox for human review.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {initial ? (
                <RulesEditor initial={initial} />
              ) : (
                <p className="text-sm text-muted-foreground">Could not load policy.</p>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>
                The rules engine is evaluated for every refund request before any money moves.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold tabular-nums text-secondary-foreground">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Detect refund intent</p>
                    <p className="text-muted-foreground">Classifier reads the message and tags it.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold tabular-nums text-secondary-foreground">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Evaluate rules</p>
                    <p className="text-muted-foreground">
                      Amount, order age, reason, evidence and customer flags are checked.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold tabular-nums text-secondary-foreground">
                    3
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Auto-approve or escalate</p>
                    <p className="text-muted-foreground">
                      Matching tickets refund automatically. Failures land in the inbox.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
