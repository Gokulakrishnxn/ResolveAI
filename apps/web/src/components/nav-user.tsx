'use client';

import { SignedIn, SignedOut, SignInButton, useUser, UserButton } from '@clerk/nextjs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { LogIn } from 'lucide-react';

export function NavUser(): JSX.Element {
  useSidebar();
  const { user, isLoaded } = useUser();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SignedIn>
          <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? 'User'} />
              <AvatarFallback className="rounded-lg bg-secondary text-xs font-medium">
                {(user?.firstName?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {isLoaded ? (user?.fullName ?? user?.username ?? 'You') : 'Loading…'}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress ?? ''}
              </span>
            </div>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-7 w-7' } }} />
          </SidebarMenuButton>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <LogIn className="size-4" />
              Sign in
            </Button>
          </SignInButton>
        </SignedOut>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
