/**
 * Role-based access control — central definition of what each role can
 * do, surfaced to API route handlers via a small `can(role, action)`
 * helper.
 *
 * Roles match the Prisma `UserRole` enum (mirrored locally to keep this
 * package free of a hard `@prisma/client` dependency).
 */

export type RbacRole = 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER' | 'SUPER_ADMIN';

export type RbacAction =
  // Tickets / inbox
  | 'ticket.read'
  | 'ticket.assign'
  | 'ticket.send_reply'
  | 'ticket.escalate'
  | 'ticket.delete'
  // Refunds / actions
  | 'action.approve'
  | 'action.reject'
  | 'action.execute'
  // Settings
  | 'settings.read'
  | 'settings.update'
  | 'rules.read'
  | 'rules.update'
  | 'integrations.read'
  | 'integrations.update'
  | 'knowledge.read'
  | 'knowledge.update'
  // Billing
  | 'billing.read'
  | 'billing.update'
  // Users / admin
  | 'user.invite'
  | 'user.remove'
  | 'admin.console';

const READ_EVERYTHING: RbacAction[] = [
  'ticket.read',
  'settings.read',
  'rules.read',
  'integrations.read',
  'knowledge.read',
  'billing.read',
];

const AGENT_PERMISSIONS: RbacAction[] = [
  ...READ_EVERYTHING,
  'ticket.assign',
  'ticket.send_reply',
  'ticket.escalate',
  'action.approve',
  'action.reject',
];

const ADMIN_PERMISSIONS: RbacAction[] = [
  ...AGENT_PERMISSIONS,
  'ticket.delete',
  'action.execute',
  'settings.update',
  'rules.update',
  'integrations.update',
  'knowledge.update',
  'user.invite',
  'user.remove',
];

const OWNER_PERMISSIONS: RbacAction[] = [...ADMIN_PERMISSIONS, 'billing.update'];

const PERMISSIONS: Record<RbacRole, ReadonlySet<RbacAction>> = {
  VIEWER: new Set(READ_EVERYTHING),
  AGENT: new Set(AGENT_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS),
  OWNER: new Set(OWNER_PERMISSIONS),
  // SUPER_ADMIN bypasses tenant-level RBAC for /admin and ALSO holds all
  // merchant-level permissions on whatever tenant they impersonate.
  SUPER_ADMIN: new Set([...OWNER_PERMISSIONS, 'admin.console']),
};

/**
 * Returns true when the role can perform the action. Designed for use as
 * a guard at the top of HTTP handlers and React Server Components.
 */
export function can(role: RbacRole | null | undefined, action: RbacAction): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.has(action) ?? false;
}

/**
 * `assertCan` — throws a 403-shaped error so route handlers can rely on
 * the global error handler to convert it. Returns a typed sentinel so
 * call-sites that need to short-circuit can also use the boolean form.
 */
export function assertCan(role: RbacRole | null | undefined, action: RbacAction): void {
  if (!can(role, action)) {
    const err = new Error(`Forbidden: role=${role ?? 'none'} action=${action}`);
    (err as unknown as { statusCode: number }).statusCode = 403;
    (err as unknown as { code: string }).code = 'forbidden';
    throw err;
  }
}
