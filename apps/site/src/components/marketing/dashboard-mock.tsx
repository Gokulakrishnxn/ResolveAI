import {
  ArrowUpRight,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User2,
  Wallet,
} from 'lucide-react';

/**
 * Hero "fanned card" composition.
 *
 * Three independent dashboard slices:
 *   - left    · savings / balance summary (slightly tilted, lower z)
 *   - center  · main inbox + auto-resolution (forward, taller, dominant)
 *   - right   · channel + auto-refund snapshot (slightly tilted, lower z)
 *
 * On mobile we collapse to the center card only; tablets show all three.
 * Cards are pure CSS / SVG so they crisp at any DPI.
 */

export function HeroCardComposition(): JSX.Element {
  return (
    <div className="relative isolate w-full" aria-hidden>
      {/* Inner glow under the cards */}
      <div
        className="pointer-events-none absolute -inset-x-12 -top-16 -z-10 h-[420px] blur-3xl"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 30%, rgba(56,189,248,0.32) 0%, rgba(59,130,246,0.18) 35%, transparent 70%)',
        }}
      />

      <div className="relative grid grid-cols-12 items-end gap-3 sm:gap-4">
        {/* LEFT — savings card */}
        <div
          className="col-span-12 hidden translate-y-6 -rotate-[5deg] sm:col-span-4 sm:block"
          style={{ animation: 'fade-up 0.8s 200ms cubic-bezier(0.21,0.61,0.35,1) both' }}
        >
          <SavingsCard />
        </div>

        {/* CENTER — inbox card */}
        <div
          className="col-span-12 z-10 sm:col-span-4"
          style={{ animation: 'fade-up 0.8s 80ms cubic-bezier(0.21,0.61,0.35,1) both' }}
        >
          <InboxCard />
        </div>

        {/* RIGHT — channels card */}
        <div
          className="col-span-12 hidden translate-y-6 rotate-[5deg] sm:col-span-4 sm:block"
          style={{ animation: 'fade-up 0.8s 280ms cubic-bezier(0.21,0.61,0.35,1) both' }}
        >
          <ChannelsCard />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card 1 · Savings / balance                                                  */
/* -------------------------------------------------------------------------- */

function SavingsCard(): JSX.Element {
  return (
    <Frame title="Savings · 30 days" icon={<Wallet className="h-3 w-3" />}>
      <div className="px-4 pb-4 pt-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
          Net saved
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[26px] font-semibold tracking-tightest text-text-primary">
            $2,259
          </span>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-300">
            +18%
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Pill label="Resolved" value="1,824" />
          <Pill label="Cost / tkt" value="$0.18" />
        </div>

        <Sparkline />
      </div>
    </Frame>
  );
}

function Pill({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-line bg-canvas-elevated/70 px-2.5 py-2">
      <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold tracking-tight text-text-primary">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card 2 · Inbox / auto-resolution                                            */
/* -------------------------------------------------------------------------- */

function InboxCard(): JSX.Element {
  return (
    <Frame
      title="Inbox · auto-resolved"
      icon={<Sparkles className="h-3 w-3" />}
      tall
      featured
    >
      <div className="grid grid-cols-3 gap-2 px-4 pt-3">
        <KpiTile label="Auto-resolved" value="67%" trend="+8%" />
        <KpiTile label="Avg reply" value="9.4s" trend="-32%" />
        <KpiTile label="Saved" value="$1.2k" trend="+12%" />
      </div>

      <div className="mx-4 mt-3 rounded-xl border border-line bg-canvas-elevated/60 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
            Tickets · 7 days
          </p>
          <span className="text-[10px] text-text-tertiary">2,418</span>
        </div>
        <Sparkline tall />
      </div>

      <div className="mx-4 mb-4 mt-3 rounded-xl border border-line bg-canvas-elevated/60 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
            Latest auto-resolution
          </p>
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[9.5px] font-medium text-sky-300">
            12s ago
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <Bubble side="customer">
            <p className="text-[11.5px] text-text-primary">
              Where is my order <span className="font-medium">#1042</span>?
            </p>
          </Bubble>
          <Bubble side="ai">
            <p className="text-[11.5px] text-text-primary">
              Hi Tina — shipped yesterday. ETA{' '}
              <span className="font-medium text-sky-300">Thu, Apr 27</span>.
            </p>
          </Bubble>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2 text-[10.5px] text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-sky-400" /> Audit-signed
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Sent
          </span>
        </div>
      </div>
    </Frame>
  );
}

function KpiTile({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: string;
}): JSX.Element {
  const positive = trend.startsWith('+');
  return (
    <div className="rounded-lg border border-line bg-canvas-elevated/60 p-2">
      <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold tracking-tight text-text-primary">
        {value}
      </p>
      <p
        className={`mt-0.5 text-[9px] font-medium ${
          positive ? 'text-emerald-400' : 'text-sky-300'
        }`}
      >
        {trend}
      </p>
    </div>
  );
}

function Bubble({
  side,
  children,
}: {
  side: 'customer' | 'ai';
  children: React.ReactNode;
}): JSX.Element {
  const isCustomer = side === 'customer';
  return (
    <div className={`flex items-start gap-1.5 ${isCustomer ? '' : 'justify-end'}`}>
      {isCustomer && (
        <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-text-secondary">
          <User2 className="h-2.5 w-2.5" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-2.5 py-1.5 ${
          isCustomer
            ? 'rounded-tl-sm border border-line bg-white/[0.04]'
            : 'rounded-tr-sm border border-sky-400/30 bg-sky-400/10'
        }`}
      >
        {children}
      </div>
      {!isCustomer && (
        <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-sky text-canvas">
          <Sparkles className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card 3 · Channels / auto-refund                                             */
/* -------------------------------------------------------------------------- */

function ChannelsCard(): JSX.Element {
  return (
    <Frame title="Channels · live" icon={<MessageSquareText className="h-3 w-3" />}>
      <div className="px-4 pt-3 pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
          Auto-refund
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[26px] font-semibold tracking-tightest text-text-primary">
            $42.00
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-sky-300">
            approved <ArrowUpRight className="h-2.5 w-2.5" />
          </span>
        </div>

        <ul className="mt-4 space-y-2">
          <ChannelRow
            label="Email"
            volume="58%"
            tone="rose"
          />
          <ChannelRow label="Chat" volume="27%" tone="sky" />
          <ChannelRow label="WhatsApp" volume="15%" tone="emerald" />
        </ul>

        <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1.5 text-[10.5px] text-emerald-300">
          <TrendingUp className="h-3 w-3" /> CSAT lifted to 4.7 / 5
        </div>
      </div>
    </Frame>
  );
}

function ChannelRow({
  label,
  volume,
  tone,
}: {
  label: string;
  volume: string;
  tone: 'rose' | 'sky' | 'emerald';
}): JSX.Element {
  const dot =
    tone === 'rose'
      ? 'bg-rose-400/80'
      : tone === 'sky'
        ? 'bg-sky-400'
        : 'bg-emerald-400';
  const widthPct = parseInt(volume, 10);
  const bar =
    tone === 'rose'
      ? 'bg-rose-400/60'
      : tone === 'sky'
        ? 'bg-gradient-sky'
        : 'bg-emerald-400/70';
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-text-primary">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </span>
        <span className="font-medium tabular-nums text-text-secondary">{volume}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared frame                                                                */
/* -------------------------------------------------------------------------- */

function Frame({
  title,
  icon,
  children,
  tall = false,
  featured = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tall?: boolean;
  featured?: boolean;
}): JSX.Element {
  return (
    <div
      className={`surface-glass relative overflow-hidden rounded-2xl ${
        tall ? '' : ''
      } ${
        featured
          ? 'border-sky-400/30 shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_30px_70px_-20px_rgba(56,189,248,0.45)]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between border-b border-line/80 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-sky text-canvas">
            {icon}
          </span>
          <span className="text-[10.5px] font-medium tracking-tight text-text-secondary">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
        </div>
      </div>
      {children}
    </div>
  );
}

function Sparkline({ tall = false }: { tall?: boolean }): JSX.Element {
  const points = [4, 8, 6, 12, 10, 16, 18, 22, 20, 28, 32, 36, 30, 42, 48];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const w = 240;
  const h = tall ? 48 : 36;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - ((p - min) / (max - min)) * (h - 6) - 3;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`mt-3 w-full ${tall ? 'h-12' : 'h-9'}`}
      role="presentation"
    >
      <defs>
        <linearGradient id={`sky-area-${tall ? 't' : 's'}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`sky-line-${tall ? 't' : 's'}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sky-area-${tall ? 't' : 's'})`} />
      <path
        d={path}
        fill="none"
        stroke={`url(#sky-line-${tall ? 't' : 's'})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Backwards-compat re-export — older imports referenced `DashboardMock`.
 */
export { HeroCardComposition as DashboardMock };
