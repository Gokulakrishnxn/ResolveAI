import { cn } from '@/lib/utils';

export function PageBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className={cn('px-6 py-6 lg:px-10 lg:py-8', className)}>{children}</div>
  );
}
