/**
 * Optional Sentry + PostHog initializers. Safe to import unconditionally;
 * they no-op when the corresponding env vars aren't set, keeping local
 * dev frictionless.
 *
 * We use dynamic require so apps that never import these never pull the
 * SDK into their bundle, and tests can run without the deps installed.
 */
type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown) => void;
  setUser?: (user: Record<string, unknown> | null) => void;
};

type PostHogLike = {
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
  identify?: (id: string, properties?: Record<string, unknown>) => void;
  shutdown?: () => Promise<void>;
};

let sentryClient: SentryLike | null = null;
let posthogClient: PostHogLike | null = null;

interface SentryConfig {
  dsn?: string;
  environment?: string;
  serviceName?: string;
  tracesSampleRate?: number;
}

export function enableSentry(cfg: SentryConfig): SentryLike | null {
  if (!cfg.dsn) return null;
  if (sentryClient) return sentryClient;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node') as SentryLike;
    Sentry.init({
      dsn: cfg.dsn,
      environment: cfg.environment ?? process.env.NODE_ENV,
      serverName: cfg.serviceName,
      tracesSampleRate: cfg.tracesSampleRate ?? 0.1,
    });
    sentryClient = Sentry;
    return Sentry;
  } catch {
    return null;
  }
}

export function captureException(err: unknown): void {
  if (!sentryClient) {
    return;
  }
  try {
    sentryClient.captureException(err);
  } catch {
    // Never throw out of an error handler.
  }
}

interface PostHogConfig {
  apiKey?: string;
  host?: string;
}

export function enablePostHog(cfg: PostHogConfig): PostHogLike | null {
  if (!cfg.apiKey) return null;
  if (posthogClient) return posthogClient;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { PostHog } = require('posthog-node') as { PostHog: new (...args: unknown[]) => PostHogLike };
    posthogClient = new PostHog(cfg.apiKey, { host: cfg.host });
    return posthogClient;
  } catch {
    return null;
  }
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (!posthogClient) return;
  try {
    posthogClient.capture(eventName, properties);
  } catch {
    // Telemetry must never break the request path.
  }
}
