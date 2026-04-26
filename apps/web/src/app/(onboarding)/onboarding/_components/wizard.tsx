'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronRight,
  Cog,
  FileText,
  MessageSquare,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

interface OnboardingState {
  store: { id: string; name: string } | null;
  integrations: Record<string, string>;
  completedSteps: string[];
  knowledgeDocCount: number;
  ticketCount: number;
  automationPreset: 'conservative' | 'balanced' | 'aggressive' | null;
}

interface PlansResponse {
  plans: Array<{
    tier: 'STARTER' | 'GROWTH' | 'SCALE';
    name: string;
    description: string;
    priceMonthlyUsd: number;
    includedTickets: number;
    features: string[];
    priceId: string | null;
  }>;
  trialDays: number;
  trialIncludedTickets: number;
}

const STEPS = [
  { id: 'platform', label: 'Connect Shopify', icon: ShoppingBag },
  { id: 'channel', label: 'Connect channels', icon: MessageSquare },
  { id: 'knowledge', label: 'Upload policies', icon: FileText },
  { id: 'automation', label: 'Choose automation', icon: Cog },
  { id: 'test', label: 'Send test ticket', icon: Sparkles },
] as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const STORE_ID = process.env.NEXT_PUBLIC_DEMO_STORE_ID ?? '';
const USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? '';

async function callApi<T>(
  path: string,
  init: RequestInit & { body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-store-id': STORE_ID,
      'x-user-id': USER_ID,
      ...(init.headers as Record<string, string> | undefined),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export function OnboardingWizard({
  initialState,
  plans,
  stepParam,
}: {
  initialState: OnboardingState;
  plans: PlansResponse;
  stepParam?: string;
}): JSX.Element {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const initialStepIdx = useMemo(() => {
    if (stepParam) {
      const i = STEPS.findIndex((s) => s.id === stepParam);
      if (i >= 0) return i;
    }
    const next = STEPS.findIndex((s) => !state.completedSteps.includes(s.id));
    return next === -1 ? STEPS.length - 1 : next;
  }, [state.completedSteps, stepParam]);
  const [stepIdx, setStepIdx] = useState(initialStepIdx);
  const step = STEPS[stepIdx];

  function gotoStep(idx: number): void {
    setStepIdx(Math.max(0, Math.min(STEPS.length - 1, idx)));
  }

  async function refreshState(): Promise<void> {
    const next = await callApi<OnboardingState>('/onboarding/state');
    setState(next);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 text-center">
        <p className="text-sm font-medium text-primary">
          {state.store?.name ?? 'Welcome'} — {plans.trialDays}-day free trial
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Get to your first AI resolution in under 5 minutes
        </h1>
        <p className="mt-3 text-muted-foreground">
          Five quick steps. You can finish later from{' '}
          <Link className="underline" href="/dashboard">
            Dashboard
          </Link>
          .
        </p>
      </header>

      <ol className="mb-8 grid grid-cols-5 gap-2">
        {STEPS.map((s, i) => {
          const done = state.completedSteps.includes(s.id);
          const active = i === stepIdx;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => gotoStep(i)}
                className={`flex w-full flex-col items-center gap-2 rounded-md border px-2 py-3 text-xs transition ${
                  active
                    ? 'border-primary bg-primary/10 text-foreground'
                    : done
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                <span className="text-center font-medium">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="rounded-lg border bg-card p-8 shadow-sm">
        {step.id === 'platform' && (
          <PlatformStep state={state} onContinue={() => gotoStep(stepIdx + 1)} />
        )}
        {step.id === 'channel' && (
          <ChannelStep state={state} onContinue={() => gotoStep(stepIdx + 1)} />
        )}
        {step.id === 'knowledge' && (
          <KnowledgeStep
            state={state}
            onContinue={() => {
              void refreshState();
              gotoStep(stepIdx + 1);
            }}
          />
        )}
        {step.id === 'automation' && (
          <AutomationStep
            state={state}
            onContinue={async () => {
              await refreshState();
              gotoStep(stepIdx + 1);
            }}
          />
        )}
        {step.id === 'test' && (
          <TestTicketStep
            onFinish={() => {
              router.push('/dashboard');
            }}
          />
        )}

        <footer className="mt-8 flex justify-between border-t pt-6">
          <button
            type="button"
            className="text-sm text-muted-foreground underline disabled:opacity-50"
            onClick={() => gotoStep(stepIdx - 1)}
            disabled={stepIdx === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => gotoStep(stepIdx + 1)}
          >
            Skip <ChevronRight className="h-4 w-4" />
          </button>
        </footer>
      </div>
    </div>
  );
}

function PlatformStep({
  state,
  onContinue,
}: {
  state: OnboardingState;
  onContinue: () => void;
}): JSX.Element {
  const connected = state.integrations.SHOPIFY === 'ACTIVE';
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Connect your store</h2>
      <p className="text-muted-foreground">
        ResolveAI uses Shopify to fetch order &amp; tracking data and (with your approval) issue
        refunds. We never modify orders without your rules engine OK&apos;ing it first.
      </p>
      <div className="flex items-center gap-3 rounded-md border bg-background p-4">
        <ShoppingBag className="h-6 w-6" />
        <div className="flex-1">
          <div className="font-medium">Shopify</div>
          <div className="text-sm text-muted-foreground">Read orders, customers, products.</div>
        </div>
        {connected ? (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700">
            Connected
          </span>
        ) : (
          <Link
            href="/integrations"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Connect
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-md border px-4 py-2 text-sm"
      >
        {connected ? 'Continue' : "I'll do this later"}
      </button>
    </div>
  );
}

function ChannelStep({
  state,
  onContinue,
}: {
  state: OnboardingState;
  onContinue: () => void;
}): JSX.Element {
  const channels: Array<{ id: string; label: string; configured: boolean }> = [
    { id: 'EMAIL_IMAP', label: 'Email (IMAP + SMTP)', configured: !!state.integrations.EMAIL_IMAP },
    { id: 'CHAT', label: 'Website chat widget', configured: !!state.integrations.CHAT },
    { id: 'WHATSAPP_CLOUD', label: 'WhatsApp Business', configured: !!state.integrations.WHATSAPP_CLOUD },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Plug in your support channels</h2>
      <p className="text-muted-foreground">
        Pick at least one — you can add the others later. ResolveAI ingests, classifies, and
        responds to messages from every channel through the same pipeline.
      </p>
      <div className="space-y-2">
        {channels.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-md border p-3 text-sm"
          >
            <span className="font-medium">{c.label}</span>
            {c.configured ? (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700">
                Configured
              </span>
            ) : (
              <Link
                href="/integrations"
                className="rounded-md border px-3 py-1.5 text-xs font-medium"
              >
                Configure
              </Link>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-md border px-4 py-2 text-sm"
      >
        Continue
      </button>
    </div>
  );
}

function KnowledgeStep({
  state,
  onContinue,
}: {
  state: OnboardingState;
  onContinue: () => void;
}): JSX.Element {
  const [title, setTitle] = useState('Shipping policy');
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(): void {
    setError(null);
    startTransition(async () => {
      try {
        await callApi('/knowledge/docs', {
          method: 'POST',
          body: { title, body, source: 'manual', tags: ['onboarding'] },
        });
        onContinue();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Upload your policies</h2>
      <p className="text-muted-foreground">
        Paste your shipping / returns / FAQ copy and we&apos;ll embed it so the AI can cite real
        store policy. You can also auto-import Shopify pages from{' '}
        <Link href="/knowledge" className="underline">
          Knowledge
        </Link>
        .
      </p>
      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <textarea
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste your shipping / returns / FAQ text here…"
          className="w-full rounded-md border px-3 py-2 font-mono text-xs"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!body || pending}
            onClick={submit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {pending ? 'Indexing…' : 'Save & continue'}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Skip
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Already indexed: {state.knowledgeDocCount} document
          {state.knowledgeDocCount === 1 ? '' : 's'}.
        </p>
      </div>
    </div>
  );
}

function AutomationStep({
  state,
  onContinue,
}: {
  state: OnboardingState;
  onContinue: () => Promise<void>;
}): JSX.Element {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<'conservative' | 'balanced' | 'aggressive'>(
    state.automationPreset ?? 'balanced',
  );

  function pick(preset: 'conservative' | 'balanced' | 'aggressive'): void {
    setSelected(preset);
    setError(null);
    startTransition(async () => {
      try {
        await callApi('/onboarding/automation-preset', {
          method: 'POST',
          body: { preset },
        });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const presets: Array<{
    id: 'conservative' | 'balanced' | 'aggressive';
    title: string;
    body: string;
  }> = [
    {
      id: 'conservative',
      title: 'Conservative',
      body: 'AI drafts every reply, but a human approves before anything goes out.',
    },
    {
      id: 'balanced',
      title: 'Balanced',
      body: 'Auto-refund up to $50 within 30 days. Photo required for damage / wrong item.',
    },
    {
      id: 'aggressive',
      title: 'Aggressive',
      body: 'Auto-refund up to $200 within 60 days. Broader reasons, no photo required.',
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Choose your automation level</h2>
      <p className="text-muted-foreground">
        Pick a starting point — you can fine-tune any rule later in{' '}
        <Link href="/settings/rules" className="underline">
          Rules
        </Link>
        .
      </p>
      <div className="grid gap-3">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p.id)}
            className={`rounded-lg border p-4 text-left transition hover:border-primary ${
              selected === p.id ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <div className="font-medium">{p.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          void onContinue();
        }}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}

function TestTicketStep({ onFinish }: { onFinish: () => void }): JSX.Element {
  const [pending, startTransition] = useTransition();
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<'order_status' | 'refund' | 'wrong_item'>('order_status');

  function run(): void {
    setError(null);
    startTransition(async () => {
      try {
        const res = await callApi<{ ticketId: string }>('/onboarding/test-ticket', {
          method: 'POST',
          body: { scenario },
        });
        setTicketId(res.ticketId);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Send a test ticket</h2>
      <p className="text-muted-foreground">
        We&apos;ll synthesize a realistic message and route it through the same pipeline your real
        customers will hit. Watch the AI reply land in the inbox in seconds.
      </p>
      <div className="flex flex-wrap gap-2">
        {(['order_status', 'refund', 'wrong_item'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScenario(s)}
            className={`rounded-full border px-3 py-1 text-xs ${
              scenario === s ? 'border-primary bg-primary/10' : ''
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Creating ticket…' : 'Send test ticket'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ticketId && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="font-medium text-emerald-700">Ticket created.</p>
          <p className="mt-1 text-muted-foreground">
            Open the inbox to watch the AI process it in real time.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/inbox/${ticketId}`}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Open ticket
            </Link>
            <button
              type="button"
              onClick={onFinish}
              className="rounded-md border px-3 py-1.5 text-xs"
            >
              Finish setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
