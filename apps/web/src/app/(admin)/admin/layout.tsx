import Link from 'next/link';
import { LayoutDashboard, Building2 } from 'lucide-react';

/**
 * Admin layout — gated by API-side `User.role = SUPER_ADMIN`. The
 * surface is intentionally separate from the merchant dashboard so it
 * can never accidentally leak into the customer-facing app shell.
 */
export const metadata = {
  title: 'Admin · ResolveAI',
};

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/stores', label: 'Stores', icon: Building2 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr] bg-zinc-950 text-zinc-100">
      <aside className="flex flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="flex h-16 items-center px-6 text-lg font-semibold">
          <span className="text-rose-400">ResolveAI</span>&nbsp;Admin
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-800 p-4 text-xs text-zinc-500">
          Internal staff only
        </div>
      </aside>
      <main className="bg-zinc-950">{children}</main>
    </div>
  );
}
