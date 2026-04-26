import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';
import { ShopifyConnectForm } from './_components/shopify-form';
import { SmtpConnectForm } from './_components/smtp-form';
import { ImapConnectForm } from './_components/imap-form';

interface Integration {
  id: string;
  kind: string;
  status: string;
  externalId: string | null;
  scopes: string[];
  lastSyncAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
}

export const dynamic = 'force-dynamic';

export default async function IntegrationsPage(): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();
  let items: Integration[] = [];
  try {
    const data = await apiFetch<{ items: Integration[] }>('/integrations', { storeId, userId });
    items = data.items;
  } catch {
    items = [];
  }
  const shopify = items.find((i) => i.kind === 'SHOPIFY');
  const smtp = items.find((i) => i.kind === 'EMAIL_SMTP');
  const imap = items.find((i) => i.kind === 'EMAIL_IMAP');

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect Shopify and email so ResolveAI can read tickets, fetch orders, and reply.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Shopify</CardTitle>
              {shopify ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="muted">Not connected</Badge>
              )}
            </div>
            <CardDescription>
              {shopify
                ? `Shop: ${shopify.externalId ?? '(unknown)'} · scopes: ${shopify.scopes.join(', ') || 'n/a'}`
                : 'Install the ResolveAI app on your Shopify store to grant order + refund access.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShopifyConnectForm currentShop={shopify?.externalId ?? null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Email — SMTP (outbound)</CardTitle>
              {smtp ? <Badge variant="success">Connected</Badge> : <Badge variant="muted">Not connected</Badge>}
            </div>
            <CardDescription>
              Replies go out via your verified domain. DKIM is optional but strongly recommended for deliverability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SmtpConnectForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Email — IMAP (inbound)</CardTitle>
              {imap ? <Badge variant="success">Connected</Badge> : <Badge variant="muted">Not connected</Badge>}
            </div>
            <CardDescription>
              We listen on IMAP IDLE so new tickets are picked up within seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImapConnectForm />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
