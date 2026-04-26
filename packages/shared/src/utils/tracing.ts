/**
 * Lightweight OpenTelemetry bootstrap that is safe to call from any
 * service entrypoint. When OTEL_ENABLED is not set we skip initialisation
 * entirely and the API surface degrades to no-ops, so production code that
 * uses `withSpan` keeps working without the SDK installed.
 *
 * This module avoids a static dependency on the OTel SDK packages so that
 * the monorepo doesn't have to pull them into bundles that don't need
 * tracing. They're only `require`d when `enableTracing()` is called and
 * the env opt-in is present.
 */

export interface TracingBootstrapOptions {
  serviceName?: string;
  endpoint?: string;
  headers?: string;
  enabled?: boolean;
}

interface MinimalSpan {
  setAttribute(key: string, value: unknown): void;
  recordException(err: unknown): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

interface MinimalTracer {
  startActiveSpan<T>(name: string, fn: (span: MinimalSpan) => Promise<T> | T): Promise<T>;
}

const NOOP_SPAN: MinimalSpan = {
  setAttribute: () => {},
  recordException: () => {},
  setStatus: () => {},
  end: () => {},
};

const NOOP_TRACER: MinimalTracer = {
  async startActiveSpan(_name, fn) {
    return await fn(NOOP_SPAN);
  },
};

let activeTracer: MinimalTracer = NOOP_TRACER;
let bootstrapped = false;

/**
 * Initialise OTel — must be called once per process before any tracing
 * happens. When `enabled` is false the function is a no-op.
 *
 * Failure to load the SDK packages is intentionally swallowed (with a
 * `console.warn`) because tracing should never crash a service.
 */
export function enableTracing(opts: TracingBootstrapOptions = {}): void {
  const enabled = opts.enabled ?? process.env.OTEL_ENABLED === 'true';
  if (!enabled || bootstrapped) return;
  bootstrapped = true;

  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const sdkNode = require('@opentelemetry/sdk-node') as {
      NodeSDK: new (config: Record<string, unknown>) => { start: () => void };
    };
    const resources = require('@opentelemetry/resources') as {
      Resource: new (attrs: Record<string, unknown>) => unknown;
    };
    const semconv = require('@opentelemetry/semantic-conventions') as {
      SemanticResourceAttributes?: Record<string, string>;
    };
    const otlp = require('@opentelemetry/exporter-trace-otlp-http') as {
      OTLPTraceExporter: new (config: Record<string, unknown>) => unknown;
    };
    const api = require('@opentelemetry/api') as {
      trace: { getTracer: (name: string) => MinimalTracer };
    };
    /* eslint-enable @typescript-eslint/no-require-imports */

    const serviceName = opts.serviceName ?? process.env.OTEL_SERVICE_NAME ?? 'resolveai';
    const endpoint = opts.endpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const headers = parseHeaders(opts.headers ?? process.env.OTEL_EXPORTER_OTLP_HEADERS);

    const sdk = new sdkNode.NodeSDK({
      resource: new resources.Resource({
        [semconv.SemanticResourceAttributes?.['SERVICE_NAME'] ?? 'service.name']: serviceName,
      }),
      traceExporter: endpoint
        ? new otlp.OTLPTraceExporter({ url: endpoint, headers })
        : undefined,
    });
    sdk.start();

    activeTracer = api.trace.getTracer(serviceName);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[tracing] OpenTelemetry SDK not installed; tracing disabled', err);
  }
}

function parseHeaders(raw?: string): Record<string, string> | undefined {
  if (!raw) return undefined;
  const out: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split('=');
    if (k && v) out[k.trim()] = v.trim();
  }
  return out;
}

/**
 * Run `fn` inside an active span. When tracing is disabled this is a
 * straight pass-through so callers pay almost nothing.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: MinimalSpan) => Promise<T> | T,
): Promise<T> {
  return activeTracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: 2, message: (err as Error).message }); // ERROR
      throw err;
    } finally {
      span.end();
    }
  });
}

export function getTracer(): MinimalTracer {
  return activeTracer;
}
