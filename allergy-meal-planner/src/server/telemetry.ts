import * as Sentry from "@sentry/node";
import { config } from "./config.ts";

export interface Span {
  setAttribute: (key: string, value: string | number | boolean) => void;
}

export interface RunMetric {
  kind: "chat" | "classify";
  provider: string;
  model: string;
  latencyMs: number;
  ok: boolean;
  at: string;
}

const metrics: { runs: number; errors: number; last: RunMetric | null } = {
  runs: 0,
  errors: 0,
  last: null,
};

// Sentry node profiling uses a native NAPI addon; Bun cannot load it (uv_default_loop
// panic). So profiling is enabled only on real Node — tracing works on both.
const isBun = typeof process !== "undefined" && "bun" in process.versions;

export async function initTelemetry(): Promise<{ tracing: boolean; profiling: boolean }> {
  if (!config.sentryDsn) return { tracing: false, profiling: false };

  const integrations: NonNullable<Sentry.NodeOptions["integrations"]> = [];
  let profiling = false;
  if (!isBun) {
    try {
      const { nodeProfilingIntegration } = await import("@sentry/profiling-node");
      integrations.push(nodeProfilingIntegration());
      profiling = true;
    } catch {
      // profiling binary unavailable
    }
  }

  const options: Sentry.NodeOptions = {
    dsn: config.sentryDsn,
    integrations,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV ?? "development",
  };
  if (profiling) {
    options.profileSessionSampleRate = 1.0;
    options.profileLifecycle = "trace";
  }
  Sentry.init(options);
  return { tracing: true, profiling };
}

// Wrap a unit of agent work in a Sentry span (op `gen_ai`), with attributes and latency.
export async function traced<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  if (!config.sentryDsn) {
    return fn({ setAttribute: () => {} });
  }
  return Sentry.startSpan({ name, op: "gen_ai" }, async (span) => {
    for (const [key, value] of Object.entries(attributes)) span.setAttribute(key, value);
    try {
      return await fn(span);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
}

export function recordRun(metric: RunMetric): void {
  metrics.runs += 1;
  metrics.last = metric;
  if (!metric.ok) metrics.errors += 1;
}

export function snapshotMetrics(): { runs: number; errors: number; last: RunMetric | null } {
  return { ...metrics };
}
