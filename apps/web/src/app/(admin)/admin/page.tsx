import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface AdminOverview {
  stores: number;
  totalTickets: number;
  openTickets: number;
  activeSubscriptions: number;
  aiCostUsd: number;
  mrrUsd: number;
}

export default async function AdminOverviewPage(): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();

  let overview: AdminOverview | null = null;
  let denied = false;
  try {
    overview = await apiFetch<AdminOverview>('/admin/overview', { storeId, userId });
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) denied = true;
  }

  if (denied) {
    return (
      <div className="p-12">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Your account does not have the SUPER_ADMIN role. Contact a platform admin if this is an
          error.
        </p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-12 text-zinc-400">Could not load admin overview. Try again.</div>
    );
  }

  const cards = [
    { label: 'MRR', value: `$${overview.mrrUsd.toLocaleString()}` },
    { label: 'Active subscriptions', value: overview.activeSubscriptions.toLocaleString() },
    { label: 'Stores', value: overview.stores.toLocaleString() },
    { label: 'Open tickets', value: overview.openTickets.toLocaleString() },
    { label: 'Total tickets', value: overview.totalTickets.toLocaleString() },
    { label: 'AI cost (lifetime)', value: `$${overview.aiCostUsd.toFixed(2)}` },
  ];

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Platform overview</h1>
        <p className="text-sm text-zinc-400">
          Real-time snapshot across every ResolveAI tenant.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <Link
          href="/admin/stores"
          className="inline-flex items-center rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white"
        >
          Browse stores
        </Link>
      </div>
    </div>
  );
}
