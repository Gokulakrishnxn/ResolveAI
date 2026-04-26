'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface AutoRefundPolicy {
  enabled: boolean;
  maxAmountUsd: number;
  maxOrderAgeDays: number;
  allowedReasons: string[];
  requirePhotoFor: string[];
  blocklistCustomerFlags: string[];
}

interface Policy {
  version: number;
  autoRefund: AutoRefundPolicy;
}

const REASONS = [
  { code: 'not_received', label: 'Not received' },
  { code: 'damaged', label: 'Damaged' },
  { code: 'wrong_item', label: 'Wrong item' },
  { code: 'changed_mind', label: 'Changed mind' },
  { code: 'late_delivery', label: 'Late delivery' },
  { code: 'duplicate_order', label: 'Duplicate order' },
  { code: 'other', label: 'Other' },
];

const FLAGS = [
  { code: 'fraud_suspected', label: 'Suspected fraud' },
  { code: 'chargeback_history', label: 'Chargeback history' },
  { code: 'velocity_excess', label: 'Velocity excess' },
  { code: 'high_refund_ratio', label: 'High refund ratio' },
  { code: 'manual_review', label: 'Manual review' },
];

interface SimulationResult {
  decision: 'AUTO_APPROVE' | 'REQUIRE_HUMAN' | 'REJECT';
  reasons: { code: string; message: string }[];
  policyVersion: number;
  evaluatedAt: string;
}

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function callApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const storeId = process.env.NEXT_PUBLIC_DEMO_STORE_ID;
  const userId = process.env.NEXT_PUBLIC_DEMO_USER_ID;
  if (storeId) headers.set('x-store-id', storeId);
  if (userId) headers.set('x-user-id', userId);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export function RulesEditor({ initial }: { initial: Policy }): JSX.Element {
  const [policy, setPolicy] = useState<Policy>(initial);
  const [saving, startSaving] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [sim, setSim] = useState({
    reasonCode: 'damaged',
    hasPhoto: true,
    requestedAmountUsd: 25,
    orderAgeDays: 7,
    customerFlags: [] as string[],
  });
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simRunning, startSim] = useTransition();

  const updateAR = (patch: Partial<AutoRefundPolicy>): void => {
    setPolicy((p) => ({ ...p, autoRefund: { ...p.autoRefund, ...patch } }));
  };

  const save = (): void => {
    startSaving(async () => {
      try {
        const res = await callApi<{ policy: Policy }>(`/settings/rules`, {
          method: 'PUT',
          body: JSON.stringify({ autoRefund: policy.autoRefund }),
        });
        setPolicy(res.policy);
        setSavedAt(new Date().toLocaleTimeString());
      } catch (err) {
        alert(`Save failed: ${(err as Error).message}`);
      }
    });
  };

  const simulate = (): void => {
    startSim(async () => {
      try {
        const res = await callApi<{ result: SimulationResult }>(`/settings/rules/simulate`, {
          method: 'POST',
          body: JSON.stringify({
            policy,
            input: {
              reasonCode: sim.reasonCode,
              hasPhoto: sim.hasPhoto,
              requestedAmountUsd: sim.requestedAmountUsd,
              order: {
                ageDays: sim.orderAgeDays,
                currency: 'USD',
                totalAmountUsd: sim.requestedAmountUsd,
              },
              customer: { flags: sim.customerFlags },
            },
          }),
        });
        setSimResult(res.result);
      } catch (err) {
        alert(`Simulation failed: ${(err as Error).message}`);
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable auto-refunds</p>
            <p className="text-xs text-muted-foreground">
              When off, every refund still requires merchant approval.
            </p>
          </div>
          <Checkbox
            checked={policy.autoRefund.enabled}
            onCheckedChange={(v: boolean | 'indeterminate') => updateAR({ enabled: v === true })}
            aria-label="Enable auto-refunds"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="ar-max-amount">Max refund amount (USD)</Label>
            <Input
              id="ar-max-amount"
              type="number"
              min={0}
              value={policy.autoRefund.maxAmountUsd}
              onChange={(e) => updateAR({ maxAmountUsd: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ar-max-age">Max order age (days)</Label>
            <Input
              id="ar-max-age"
              type="number"
              min={0}
              value={policy.autoRefund.maxOrderAgeDays}
              onChange={(e) => updateAR({ maxOrderAgeDays: Number(e.target.value) })}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="font-medium text-sm">Allowed refund reasons</p>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <label key={r.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={policy.autoRefund.allowedReasons.includes(r.code)}
                  onCheckedChange={() =>
                    updateAR({ allowedReasons: toggle(policy.autoRefund.allowedReasons, r.code) })
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-sm">Require photo for</p>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <label key={r.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={policy.autoRefund.requirePhotoFor.includes(r.code)}
                  onCheckedChange={() =>
                    updateAR({ requirePhotoFor: toggle(policy.autoRefund.requirePhotoFor, r.code) })
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-sm">Block customers flagged as</p>
          <div className="grid grid-cols-2 gap-2">
            {FLAGS.map((f) => (
              <label key={f.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={policy.autoRefund.blocklistCustomerFlags.includes(f.code)}
                  onCheckedChange={() =>
                    updateAR({
                      blocklistCustomerFlags: toggle(
                        policy.autoRefund.blocklistCustomerFlags,
                        f.code,
                      ),
                    })
                  }
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-xs text-muted-foreground">
            Version {policy.version}
            {savedAt ? ` • saved ${savedAt}` : null}
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save policy'}
          </Button>
        </div>
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Simulate decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sim-reason">Reason</Label>
              <select
                id="sim-reason"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={sim.reasonCode}
                onChange={(e) => setSim((s) => ({ ...s, reasonCode: e.target.value }))}
              >
                {REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sim-amount">Amount (USD)</Label>
              <Input
                id="sim-amount"
                type="number"
                min={0}
                value={sim.requestedAmountUsd}
                onChange={(e) =>
                  setSim((s) => ({ ...s, requestedAmountUsd: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sim-age">Order age (days)</Label>
              <Input
                id="sim-age"
                type="number"
                min={0}
                value={sim.orderAgeDays}
                onChange={(e) => setSim((s) => ({ ...s, orderAgeDays: Number(e.target.value) }))}
              />
            </div>
            <label className="flex items-end gap-2 text-sm">
              <Checkbox
                checked={sim.hasPhoto}
                onCheckedChange={(v: boolean | 'indeterminate') =>
                  setSim((s) => ({ ...s, hasPhoto: v === true }))
                }
              />
              Customer attached a photo
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Customer flags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FLAGS.map((f) => (
                <label key={f.code} className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={sim.customerFlags.includes(f.code)}
                    onCheckedChange={() =>
                      setSim((s) => ({ ...s, customerFlags: toggle(s.customerFlags, f.code) }))
                    }
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={simulate} disabled={simRunning} variant="secondary">
            {simRunning ? 'Running...' : 'Simulate decision'}
          </Button>

          {simResult && (
            <div className="rounded-md border bg-background p-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    simResult.decision === 'AUTO_APPROVE'
                      ? 'success'
                      : simResult.decision === 'REJECT'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {simResult.decision.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  v{simResult.policyVersion} • {new Date(simResult.evaluatedAt).toLocaleTimeString()}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {simResult.reasons.map((r, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                    <span className="ml-2">{r.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
