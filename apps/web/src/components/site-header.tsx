import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function SiteHeader({ title = 'Dashboard' }: { title?: string }): JSX.Element {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b border-border/60 bg-background/85 backdrop-blur-xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
        <h1 className="text-[13px] font-medium tracking-tight text-foreground/80">{title}</h1>
      </div>
    </header>
  );
}
