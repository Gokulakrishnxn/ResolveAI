'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  BookOpen,
  CreditCard,
  Inbox,
  LayoutDashboardIcon,
  Plug,
  ScrollText,
  Settings,
  Sparkles,
} from 'lucide-react';

const NAV_MAIN = [
  { title: 'Overview', url: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Inbox', url: '/inbox', icon: Inbox },
  { title: 'Knowledge', url: '/knowledge', icon: BookOpen },
] as const;

const NAV_SETTINGS = [
  { title: 'Integrations', url: '/integrations', icon: Plug },
  { title: 'Rules', url: '/settings/rules', icon: ScrollText },
  { title: 'Billing', url: '/settings/billing', icon: CreditCard },
  { title: 'Settings', url: '/settings', icon: Settings },
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>): JSX.Element {
  const pathname = usePathname() ?? '/';

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/60 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="hover:bg-transparent active:bg-transparent data-[slot=sidebar-menu-button]:!px-2"
            >
              <Link href="/dashboard" className="gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[15px] font-semibold tracking-tight">ResolveAI</span>
                  <span className="text-[11px] text-sidebar-foreground/60">
                    AI Customer Support
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-0.5">
            <SidebarMenu>
              {NAV_MAIN.map((item) => {
                const active = pathname === item.url || pathname.startsWith(`${item.url}/`);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-0.5">
            <SidebarMenu>
              {NAV_SETTINGS.map((item) => {
                const active = pathname === item.url || pathname.startsWith(`${item.url}/`);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
