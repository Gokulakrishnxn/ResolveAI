'use client';

import { useMemo, useState } from 'react';

const HUMAN_HANDLE_MIN = 6;
const AUTO_RESOLUTION_RATE = 0.7;

interface PlanTier {
  name: 'Starter' | 'Growth' | 'Scale';
  priceUsd: number;
  includedTickets: number;
}

const PLANS: PlanTier[] = [
  { name: 'Starter', priceUsd: 29, includedTickets: 500 },
  { name: 'Growth', priceUsd: 99, includedTickets: 2_500 },
  { name: 'Scale', priceUsd: 299, includedTickets: 10_000 },
];

const OVERAGE_PER_TICKET_USD = 0.05;

/**
 * Pure pricing math — also used in the SVG ROI graph below. Picks the
 * cheapest plan whose included quota covers the metered tickets, falling
 * back to Scale + overage for very high volumes.
 */
function computeMonthlyResolveCost(autoResolved: number): {
  plan: PlanTier;
  overageTickets: number;
  totalUsd: number;
} {
  const plan = PLANS.find((p) => autoResolved <= p.includedTickets) ?? PLANS[PLANS.length - 1];
  const overageTickets = Math.max(0, autoResolved - plan.includedTickets);
  const totalUsd = plan.priceUsd + overageTickets * OVERAGE_PER_TICKET_USD;
  return { plan, overageTickets, totalUsd };
}

export function RoiCalculator(): JSX.Element {
  const [monthlyTickets, setMonthlyTickets] = useState(2_000);
  const [hourlyCostUsd, setHourlyCostUsd] = useState(20);

  const summary = useMemo(() => {
    const autoResolved = Math.round(monthlyTickets * AUTO_RESOLUTION_RATE);
    const humanHoursSaved = (autoResolved * HUMAN_HANDLE_MIN) / 60;
    const humanCostUsd = humanHoursSaved * hourlyCostUsd;
    const resolve = computeMonthlyResolveCost(autoResolved);
    const netSavingsUsd = humanCostUsd - resolve.totalUsd;
    return {
      autoResolved,
      humanHoursSaved,
      humanCostUsd,
      resolve,
      netSavingsUsd,
    };
  }, [monthlyTickets, hourlyCostUsd]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tickets per month">
          <input
            type="number"
            min={50}
            max={50_000}
            value={monthlyTickets}
            onChange={(e) => setMonthlyTickets(Math.max(0, Number(e.target.value)))}
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            type="range"
            min={100}
            max={20_000}
            step={100}
            value={monthlyTickets}
            onChange={(e) => setMonthlyTickets(Number(e.target.value))}
            className="mt-3 w-full accent-violet-500"
          />
        </Field>
        <Field label="Loaded support cost ($/hour)">
          <input
            type="number"
            min={5}
            max={200}
            value={hourlyCostUsd}
            onChange={(e) => setHourlyCostUsd(Math.max(0, Number(e.target.value)))}
            className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            type="range"
            min={10}
            max={80}
            value={hourlyCostUsd}
            onChange={(e) => setHourlyCostUsd(Number(e.target.value))}
            className="mt-3 w-full accent-violet-500"
          />
        </Field>
      </div>
      <div className="mt-6 rounded-lg bg-zinc-50 p-5 text-sm">
        <Row
          label="Tickets auto-resolved by AI"
          value={summary.autoResolved.toLocaleString()}
        />
        <Row
          label="Human hours freed up"
          value={`${summary.humanHoursSaved.toFixed(1)} hrs`}
        />
        <Row
          label="Human cost avoided"
          value={`$${summary.humanCostUsd.toFixed(0)}`}
          highlight
        />
        <Row
          label={`ResolveAI cost (${summary.resolve.plan.name}${
            summary.resolve.overageTickets ? ' + overage' : ''
          })`}
          value={`$${summary.resolve.totalUsd.toFixed(0)}`}
        />
        <div className="mt-4 border-t border-zinc-200 pt-4">
          <Row
            label="Net monthly savings"
            value={`$${summary.netSavingsUsd.toFixed(0)}`}
            primary
          />
          <Row
            label="Annual"
            value={`$${(summary.netSavingsUsd * 12).toFixed(0)}`}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Conservative model — assumes 70% auto-resolution and 6 min average human handle time.
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  highlight,
  primary,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  primary?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className={primary ? 'text-base font-semibold' : 'text-sm text-zinc-600'}>
        {label}
      </span>
      <span
        className={
          primary
            ? 'text-2xl font-semibold text-emerald-600'
            : highlight
              ? 'text-lg font-semibold text-zinc-900'
              : 'text-sm font-medium text-zinc-900'
        }
      >
        {value}
      </span>
    </div>
  );
}
