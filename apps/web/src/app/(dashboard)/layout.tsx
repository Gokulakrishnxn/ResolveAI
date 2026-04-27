import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <TooltipProvider delayDuration={150}>
      <SidebarProvider
        style={
          {
            '--sidebar-width': '15.5rem',
            '--header-height': '3.25rem',
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset className="bg-background">{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
