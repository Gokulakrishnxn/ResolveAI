import { apiFetch, ApiError } from '@/lib/api';
import { getDashboardAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface StoreRow {
  id: string;
  name: string;
  domain: string;
  platform: string;
  users: number;
  ticketsTotal: number;
  ticketsLast30d: number;
  aiCostUsd: number;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  churnRisk: 'low' | 'medium' | 'high';
}

export default async function AdminStoresPage(): Promise<JSX.Element> {
  const { storeId, userId } = getDashboardAuth();

  let items: StoreRow[] = [];
  let denied = false;
  try {
    const res = await apiFetch<{ items: StoreRow[] }>('/admin/stores?limit=100', {
      storeId,
      userId,
    });
    items = res.items;
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) denied = true;
  }

  if (denied) {
    return (
      <div className="p-12">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-zinc-400">SUPER_ADMIN role required.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Stores</h1>
        <p className="text-sm text-zinc-400">
          {items.length} {items.length === 1 ? 'store' : 'stores'} on the platform.
        </p>
      </header>
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">30d tickets</th>
              <th className="px-4 py-3 text-right">All tickets</th>
              <th className="px-4 py-3 text-right">AI cost</th>
              <th className="px-4 py-3">Churn risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {items.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-900">
                <td className="px-4 py-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-zinc-500">{s.domain}</div>
                </td>
                <td className="px-4 py-3">{s.plan}</td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3 text-right">{s.ticketsLast30d.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{s.ticketsTotal.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">${s.aiCostUsd.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.churnRisk === 'high'
                        ? 'bg-rose-500/15 text-rose-400'
                        : s.churnRisk === 'medium'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {s.churnRisk}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  No stores yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
