import type {
  AgentPort,
  AgentReply,
  AgentTurn,
  ClassificationAnswers,
  ClassificationQuestions,
  ClassifierPort,
} from "../domain/ports.ts";
import { recordRun, traced } from "../telemetry.ts";

// Decorators: add Sentry spans + latency/token metrics without touching the adapters.
// (DIP: still an AgentPort / ClassifierPort.)

export class InstrumentedAgent implements AgentPort {
  constructor(private readonly inner: AgentPort) {}

  async chat(turn: AgentTurn): Promise<AgentReply> {
    const start = Date.now();
    return traced(
      "agent.chat",
      { "gen_ai.system": "backboard", "gen_ai.provider": turn.provider, "gen_ai.request.model": turn.model },
      async (span) => {
        try {
          const reply = await this.inner.chat(turn);
          const latencyMs = Date.now() - start;
          span.setAttribute("agent.latency_ms", latencyMs);
          span.setAttribute("agent.reply_chars", reply.text.length);
          recordRun({ kind: "chat", provider: turn.provider, model: turn.model, latencyMs, ok: true, at: new Date().toISOString() });
          return reply;
        } catch (error) {
          recordRun({ kind: "chat", provider: turn.provider, model: turn.model, latencyMs: Date.now() - start, ok: false, at: new Date().toISOString() });
          throw error;
        }
      },
    );
  }
}

export class InstrumentedClassifier implements ClassifierPort {
  constructor(private readonly inner: ClassifierPort) {}

  async classify(input: { text: string; questions: ClassificationQuestions }): Promise<ClassificationAnswers> {
    const start = Date.now();
    return traced("agent.classify", { "gen_ai.system": "typesafe", "gen_ai.request.model": "jev-latest" }, async (span) => {
      const answers = await this.inner.classify(input);
      const latencyMs = Date.now() - start;
      span.setAttribute("agent.latency_ms", latencyMs);
      span.setAttribute("agent.answers", Object.keys(answers).length);
      recordRun({ kind: "classify", provider: "typesafe", model: "jev-latest", latencyMs, ok: true, at: new Date().toISOString() });
      return answers;
    });
  }
}
