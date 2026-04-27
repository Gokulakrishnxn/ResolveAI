import { Cog, Sparkles } from 'lucide-react';
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
import { getDashboardAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface IdentifierRowProps {
  label: string;
  value: string;
}

function IdentifierRow({ label, value }: IdentifierRowProps): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border/60 px-1 py-3 first:border-t-0">
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
      </div>
      <code className="rounded-md border border-border/70 bg-secondary/40 px-2 py-1 font-mono text-[11px] text-foreground/85">
        {value}
      </code>
    </div>
  );
}

interface FlagRowProps {
  title: string;
  description: React.ReactNode;
  enabled: boolean;
  warning?: boolean;
}

function FlagRow({ title, description, enabled, warning }: FlagRowProps): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-6 border-t border-border/60 px-1 py-4 first:border-t-0">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Badge variant={enabled ? (warning ? 'warning' : 'success') : 'muted'} className="shrink-0">
        {enabled ? 'On' : 'Off'}
      </Badge>
    </div>
  );
}

export default function SettingsPage(): JSX.Element {
  const { storeId, userId } = getDashboardAuth();
  const flags = {
    AUTO_RESOLVE_ORDER_STATUS: process.env.AUTO_RESOLVE_ORDER_STATUS ?? 'true',
    AUTO_APPROVE_REFUNDS: process.env.AUTO_APPROVE_REFUNDS ?? 'false',
  };

  return (
    <>
      <SiteHeader title="Settings" />

      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Per-store configuration, identifiers and AI behaviour."
        actions={
          <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
            <Cog className="size-3.5" />
            Workspace settings
          </Badge>
        }
      />

      <div className="px-6 py-6 lg:px-10 lg:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Workspace identifiers</CardTitle>
              <CardDescription>
                The store and user that the dashboard is currently authenticated as.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/70 bg-background/40 px-4">
                <IdentifierRow label="Store ID" value={storeId} />
                <IdentifierRow label="User ID" value={userId} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-secondary/40 text-foreground/80">
                  <Sparkles className="size-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle>AI behaviour</CardTitle>
                  <CardDescription>
                    Controlled by environment feature flags. Update them on the API/worker
                    deployment to apply.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/70 bg-background/40 px-4">
                <FlagRow
                  title="Auto-resolve “where is my order?”"
                  description="When enabled, ResolveAI sends an automated reply once intent confidence is at or above 80%."
                  enabled={flags.AUTO_RESOLVE_ORDER_STATUS === 'true'}
                />
                <FlagRow
                  title="Auto-approve refunds"
                  description={
                    <>
                      Phase 1 keeps this <strong className="text-foreground">off</strong>: refunds
                      always require a human click in the inbox.
                    </>
                  }
                  enabled={flags.AUTO_APPROVE_REFUNDS === 'true'}
                  warning
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
