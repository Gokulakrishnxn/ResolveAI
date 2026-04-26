import { ShopifyClient } from '@resolveai/integrations-shopify';
import { SmtpClient } from '@resolveai/integrations-email';
import { WhatsappClient } from '@resolveai/integrations-whatsapp';
import { prisma } from '@resolveai/db';
import { IntegrationError, NotFoundError } from '@resolveai/shared';
import { openCredentials } from './encryption.js';
import { getConfig } from '../config.js';

interface ShopifyCreds {
  accessToken: string;
  scope: string[];
}

interface SmtpCreds {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  dkim?: { domainName: string; keySelector: string; privateKey: string };
}

export async function getShopifyForStore(storeId: string): Promise<ShopifyClient> {
  const integration = await prisma.integration.findFirst({
    where: { storeId, kind: 'SHOPIFY', status: 'ACTIVE' },
  });
  if (!integration) throw new NotFoundError('Shopify not connected');
  if (!integration.externalId) throw new IntegrationError('Shopify integration missing shop domain');
  const creds = openCredentials<ShopifyCreds>(integration.credentials);
  return new ShopifyClient({
    shopDomain: integration.externalId,
    accessToken: creds.accessToken,
    apiVersion: getConfig().SHOPIFY_API_VERSION,
  });
}

export async function getSmtpForStore(storeId: string): Promise<SmtpClient> {
  const integration = await prisma.integration.findFirst({
    where: { storeId, kind: 'EMAIL_SMTP', status: 'ACTIVE' },
  });
  if (!integration) throw new NotFoundError('SMTP not connected');
  const creds = openCredentials<SmtpCreds>(integration.credentials);
  return new SmtpClient(creds);
}

interface WhatsappCreds {
  accessToken: string;
}

export async function getWhatsappForStore(storeId: string): Promise<{
  client: WhatsappClient;
  phoneNumberId: string;
}> {
  const integration = await prisma.integration.findFirst({
    where: { storeId, kind: 'WEBHOOK', status: 'ACTIVE' },
  });
  if (!integration) throw new NotFoundError('WhatsApp not connected');
  const cfg = (integration.config ?? {}) as Record<string, unknown>;
  if (cfg.provider !== 'whatsapp') {
    throw new NotFoundError('WhatsApp not connected (no whatsapp config)');
  }
  const phoneNumberId = String(cfg.phoneNumberId ?? '');
  if (!phoneNumberId) throw new IntegrationError('WhatsApp config missing phoneNumberId');
  const creds = openCredentials<WhatsappCreds>(integration.credentials);
  return {
    client: new WhatsappClient({ phoneNumberId, accessToken: creds.accessToken }),
    phoneNumberId,
  };
}
