/**
 * Trimmed-down DTOs for the dashboard.
 *
 * These mirror the shapes returned by `apps/api/src/routes/tickets.ts` and
 * friends. We keep the types here so the web bundle does not depend on the
 * Prisma client.
 */

export type TicketStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'AWAITING_CUSTOMER'
  | 'AWAITING_HUMAN'
  | 'RESOLVED'
  | 'CLOSED';

export type TicketIntent =
  | 'REFUND'
  | 'REPLACEMENT'
  | 'ORDER_STATUS'
  | 'WRONG_ITEM'
  | 'CHANGE_ADDRESS'
  | 'CANCEL_ORDER'
  | 'COMPLAINT'
  | 'PRODUCT_QUESTION'
  | 'GENERAL'
  | 'OTHER'
  | 'SPAM'
  | 'UNKNOWN';

export type TicketSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'ANGRY';
export type TicketUrgency = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketChannel = 'EMAIL' | 'CHAT' | 'SHOPIFY_INBOX' | 'WHATSAPP' | 'API';

export type ActionStatus =
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';

export interface TicketListItem {
  id: string;
  subject: string | null;
  status: TicketStatus;
  intent: TicketIntent;
  intentConfidence: number | null;
  urgency: TicketUrgency;
  sentiment: TicketSentiment;
  channel: TicketChannel;
  customer: { email: string | null; firstName: string | null; lastName: string | null } | null;
  createdAt: string;
  updatedAt: string;
  proposedActionId: string | null;
}

export interface TicketDetail extends TicketListItem {
  messages: Array<{
    id: string;
    role: 'CUSTOMER' | 'AGENT' | 'AI' | 'SYSTEM';
    body: string;
    authorEmail: string | null;
    authorName: string | null;
    createdAt: string;
  }>;
  proposedAction: {
    id: string;
    kind: string;
    status: ActionStatus;
    payload: Record<string, unknown>;
    eligibility: Record<string, unknown> | null;
    draftReply: string | null;
  } | null;
  order: {
    id: string;
    externalId: string;
    externalNumber: string | null;
    status: string;
    currency: string;
    totalPrice: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
  } | null;
}
