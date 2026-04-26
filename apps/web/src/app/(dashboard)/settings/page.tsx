import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDashboardAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function SettingsPage(): JSX.Element {
  const { storeId, userId } = getDashboardAuth();
  const flags = {
    AUTO_RESOLVE_ORDER_STATUS: process.env.AUTO_RESOLVE_ORDER_STATUS ?? 'true',
    AUTO_APPROVE_REFUNDS: process.env.AUTO_APPROVE_REFUNDS ?? 'false',
  };
  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Per-store configuration and AI behaviour.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Identifiers for this store and your user account.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Store ID</p>
            <p className="font-mono text-xs">{storeId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">User ID</p>
            <p className="font-mono text-xs">{userId}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI behaviour</CardTitle>
          <CardDescription>
            Controlled by environment feature flags. Change them on the API/worker deployment to apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-resolve &ldquo;where is my order?&rdquo;</p>
              <p className="text-xs text-muted-foreground">
                If enabled, ResolveAI sends a reply automatically when intent confidence ≥ 80%.
              </p>
            </div>
            <Badge variant={flags.AUTO_RESOLVE_ORDER_STATUS === 'true' ? 'success' : 'muted'}>
              {flags.AUTO_RESOLVE_ORDER_STATUS}
            </Badge>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <p className="font-medium">Auto-approve refunds</p>
              <p className="text-xs text-muted-foreground">
                Phase 1 keeps this <strong>off</strong>: refunds always need a human click.
              </p>
            </div>
            <Badge variant={flags.AUTO_APPROVE_REFUNDS === 'true' ? 'warning' : 'muted'}>
              {flags.AUTO_APPROVE_REFUNDS}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
