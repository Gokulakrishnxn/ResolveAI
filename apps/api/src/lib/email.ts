import { SmtpClient } from '@resolveai/integrations-email';
import { prisma } from '@resolveai/db';
import { NotFoundError } from '@resolveai/shared';
import { openCredentials } from './encryption.js';

interface SmtpCreds {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  dkim?: { domainName: string; keySelector: string; privateKey: string };
}

export async function getSmtpForStore(storeId: string): Promise<SmtpClient> {
  const integration = await prisma.integration.findFirst({
    where: { storeId, kind: 'EMAIL_SMTP', status: 'ACTIVE' },
  });
  if (!integration) throw new NotFoundError('SMTP integration not connected');
  const creds = openCredentials<SmtpCreds>(integration.credentials);
  return new SmtpClient(creds);
}
