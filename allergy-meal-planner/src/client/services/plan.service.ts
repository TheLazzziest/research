import type { PlanRequest, PlanResult } from "../../shared/types.ts";

// Port: components depend on this, not on HTTP.
export interface PlanService {
  plan(request: PlanRequest, signal?: AbortSignal): Promise<PlanResult>;
}

// Adapter: talks to the server's /api/plan endpoint.
export class HttpPlanService implements PlanService {
  constructor(private readonly endpoint = "/api/plan") {}

  async plan({ text, threadId }: PlanRequest, signal?: AbortSignal): Promise<PlanResult> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, threadId }),
      signal,
    });
    const data = (await res.json()) as PlanResult & { error?: string };
    if (!res.ok) throw new Error(data.error ?? `request failed (${res.status})`);
    return data;
  }
}
