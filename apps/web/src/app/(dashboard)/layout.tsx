import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import {
  BookOpen,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Plug,
  ScrollText,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/settings/rules', label: 'Rules', icon: ScrollText },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r bg-card">
        <div className="flex h-16 items-center px-6 text-lg font-semibold">ResolveAI</div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>
      <main className="bg-background">{children}</main>
    </div>
  );
}
