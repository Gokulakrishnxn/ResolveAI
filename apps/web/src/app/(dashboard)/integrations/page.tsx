import { Mail, Plug, ShoppingBag } from 'lucide-react';
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
import { ImapConnectForm } from './_components/imap-form';
import { ShopifyConnectForm } from './_components/shopify-form';
import { SmtpConnectForm } from './_components/smtp-form';

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

function StatusDot({ connected }: { connected: boolean }): JSX.Element {
  return (
    <span className="relative flex size-2">
      <span
        className={
          connected
            ? 'absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40'
            : 'absolute inline-flex h-full w-full rounded-full bg-muted'
        }
      />
      <span
        className={
          connected
            ? 'relative inline-flex size-2 rounded-full bg-emerald-500'
            : 'relative inline-flex size-2 rounded-full bg-muted-foreground/40'
        }
      />
    </span>
  );
}

interface IntegrationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  connected: boolean;
  meta?: string;
  children: React.ReactNode;
}

function IntegrationCard({
  icon,
  title,
  description,
  connected,
  meta,
  children,
}: IntegrationCardProps): JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-secondary/40 text-foreground/80">
            {icon}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{title}</CardTitle>
              <Badge variant={connected ? 'success' : 'muted'} className="gap-1.5">
                <StatusDot connected={connected} />
                {connected ? 'Connected' : 'Not connected'}
              </Badge>
            </div>
            <CardDescription className="leading-relaxed">{description}</CardDescription>
            {meta ? (
              <p className="truncate text-[11px] font-mono text-muted-foreground/80">{meta}</p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

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

  const connectedCount = [shopify, smtp, imap].filter(Boolean).length;

  return (
    <>
      <SiteHeader title="Integrations" />

      <PageHeader
        eyebrow="Connections"
        title="Integrations"
        description="Connect Shopify and email so ResolveAI can read tickets, fetch orders and reply."
        actions={
          <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
            <Plug className="size-3.5" />
            {connectedCount} of 3 connected
          </Badge>
        }
      />

      <div className="px-6 py-6 lg:px-10 lg:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <IntegrationCard
            icon={<ShoppingBag className="size-5" />}
            title="Shopify"
            description={
              shopify
                ? 'Connected. Order, fulfillment and refund webhooks are live.'
                : 'Install the ResolveAI app on your Shopify store to grant order + refund access.'
            }
            connected={Boolean(shopify)}
            meta={
              shopify
                ? `${shopify.externalId ?? 'unknown'} · scopes ${
                    shopify.scopes.join(', ') || 'n/a'
                  }`
                : undefined
            }
          >
            <ShopifyConnectForm currentShop={shopify?.externalId ?? null} />
          </IntegrationCard>

          <IntegrationCard
            icon={<Mail className="size-5" />}
            title="Email — SMTP"
            description="Replies are sent through your verified domain. DKIM strongly recommended for deliverability."
            connected={Boolean(smtp)}
          >
            <SmtpConnectForm />
          </IntegrationCard>

          <IntegrationCard
            icon={<Mail className="size-5" />}
            title="Email — IMAP"
            description="We listen on IMAP IDLE so new tickets are picked up within seconds."
            connected={Boolean(imap)}
          >
            <ImapConnectForm />
          </IntegrationCard>
        </div>
      </div>
    </>
  );
}
