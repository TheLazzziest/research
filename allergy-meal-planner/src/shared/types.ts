export interface PlanRequest {
  text: string;
  /** Continue an existing conversation (human-in-the-loop interview). */
  threadId?: string;
}

export interface PlanGate {
  status: "pass" | "flagged";
  reasons: string[];
}

export interface PlanResult {
  text: string;
  provider: string;
  model: string;
  threadId?: string;
  /** System One (Jev) typed classification (interview or output gate). */
  classification?: Record<string, unknown>;
  /** Jev gatekeeper verdict on the reply. */
  gate?: PlanGate;
}
