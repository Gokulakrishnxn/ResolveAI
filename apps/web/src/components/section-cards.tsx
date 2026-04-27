import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TrendingDownIcon, TrendingUpIcon, type LucideIcon } from 'lucide-react';

export interface SectionCardItem {
  label: string;
  value: string;
  hint: string;
  delta?: { pct: number; trend: 'up' | 'down'; positive?: boolean };
  footerLine?: string;
  Icon?: LucideIcon;
}

export function SectionCards({ items }: { items: SectionCardItem[] }): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {items.map((item) => {
        const trendUp = item.delta?.trend === 'up';
        const Trend = trendUp ? TrendingUpIcon : TrendingDownIcon;
        return (
          <Card key={item.label} className="@container/card gap-3 py-5">
            <CardHeader className="gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <CardDescription className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {item.label}
                </CardDescription>
                {item.Icon ? (
                  <span className="flex size-6 items-center justify-center rounded-md border border-border/70 bg-secondary/40 text-muted-foreground">
                    <item.Icon className="size-3.5" />
                  </span>
                ) : null}
              </div>
              <CardTitle className="text-[28px] font-semibold tabular-nums leading-none tracking-tight @[250px]/card:text-[32px]">
                {item.value}
              </CardTitle>
              {item.delta ? (
                <CardAction>
                  <Badge variant="outline" className="gap-1">
                    <Trend className="size-3" />
                    {trendUp ? '+' : ''}
                    {item.delta.pct.toFixed(1)}%
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardFooter className="flex-col items-start gap-0.5 text-xs">
              {item.footerLine ? (
                <div className="line-clamp-1 font-medium text-foreground/85">
                  {item.footerLine}
                </div>
              ) : null}
              <div className="text-muted-foreground">{item.hint}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
