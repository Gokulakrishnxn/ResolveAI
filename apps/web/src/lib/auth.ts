import { auth } from '@clerk/nextjs/server';

/**
 * Returns the active user + store context for the current request.
 *
 * In production this comes from Clerk's organisation (each org === store).
 * In development we fall back to `NEXT_PUBLIC_DEMO_STORE_ID` /
 * `NEXT_PUBLIC_DEMO_USER_ID` so contributors can run the dashboard against a
 * locally-seeded store without setting up Clerk first.
 */
export function getDashboardAuth(): { userId: string; storeId: string } {
  const session = auth();
  const fallbackStoreId = process.env.NEXT_PUBLIC_DEMO_STORE_ID ?? '';
  const fallbackUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? '';

  const userId = session.userId ?? fallbackUserId;
  const storeId = session.orgId ?? fallbackStoreId;

  if (!userId || !storeId) {
    throw new Error(
      'No active user/store. Sign in with Clerk or set NEXT_PUBLIC_DEMO_STORE_ID and NEXT_PUBLIC_DEMO_USER_ID.',
    );
  }

  return { userId, storeId };
}
