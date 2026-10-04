import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { AgentConfig } from "../config.ts";
import type { AgentPort, ClassifierPort, RoleProvider, SkillRepository } from "./ports.ts";
import type { PlanGate } from "../../shared/types.ts";
import { buildContextPrompt } from "./context.ts";

const ENTRY_SKILL = "allergy-safe-meal-planning";
const MAX_REVISIONS = 2;

const GATE_QUESTIONS = {
  allergy_safe: {
    type: "noul",
    instructions: "Does the reply avoid every allergen the client stated, including hidden ingredients?",
  },
  contains_common_allergen: {
    type: "noul",
    instructions:
      "Does the reply recommend food that commonly contains a top allergen (peanut, tree nut, shellfish, milk, egg, wheat, soy, sesame) that the client did not allow?",
  },
  concise: {
    type: "score",
    instructions: "How concise is the reply?",
    criteria: ["verbose: long paragraphs or lists", "okay: some filler", "concise: short lines, no filler"],
  },
  local_fit: {
    type: "score",
    instructions: "Does the reply fit the client's location and country of origin?",
    criteria: ["no: not available or unfamiliar", "partly: some local items", "yes: local or familiar"],
  },
} as const;

// The summariser writes only what the client should hear; the full report goes to the UI.
const SUMMARIZE_PROMPT = [
  "You write the SPOKEN SUMMARY of a nutritionist's reply.",
  "The full report is shown on screen separately: do not repeat it.",
  "Add only the highlights and any extra comments or caveats the client should hear.",
  "Rules: 1-3 short sentences, plain spoken language, no markdown, no lists, no headings.",
  "Never restate every meal. Reply with the summary text only.",
].join("\n");

function noul(answer: unknown): number | undefined {
  const value = answer as { type?: string; noul?: number };
  return value?.type === "noul" ? value.noul : undefined;
}
function score(answer: unknown): number | undefined {
  const value = answer as { type?: string; score?: number };
  return value?.type === "score" ? value.score : undefined;
}

// Deterministic policy over Jev's typed answers. The model does not decide this.
function evaluateGate(answers: Record<string, unknown>): PlanGate {
  const reasons: string[] = [];
  const safe = noul(answers.allergy_safe);
  if (safe !== undefined && safe < 0.5) reasons.push("allergy safety not confirmed");
  const common = noul(answers.contains_common_allergen);
  if (common !== undefined && common > 0.5) reasons.push("possible common allergen");
  const concise = score(answers.concise);
  if (concise !== undefined && concise <= 0) reasons.push("not concise");
  return { status: reasons.length > 0 ? "flagged" : "pass", reasons };
}

function questionCount(reply: string): number {
  return (reply.match(/\?/g) ?? []).length;
}

const Consultation = Annotation.Root({
  request: Annotation<string>(),
  threadId: Annotation<string | undefined>(),
  note: Annotation<string | undefined>(),
  reply: Annotation<string>(),
  summary: Annotation<string | undefined>(),
  revisions: Annotation<number>(),
  verdict: Annotation<PlanGate | undefined>(),
});

export interface ControllerDeps {
  agent: AgentPort;
  skills: SkillRepository;
  role: RoleProvider;
  classifier: ClassifierPort;
  config: AgentConfig;
}

// The controller is a finite-state graph: act -> gate -> (revise) act, plus a shape guard
// that keeps the agent to one question per turn. The model only writes a reply; the graph
// owns control flow and Jev judges the output. (ReAct-in-FSM)
export function buildController(deps: ControllerDeps) {
  async function systemPrompt(): Promise<string> {
    const registry = await deps.skills.load(ENTRY_SKILL);
    const entry = registry.get(ENTRY_SKILL);
    if (!entry) throw new Error(`entry skill not found: ${ENTRY_SKILL}`);
    const catalogue = [...registry.keys()].filter((name) => name !== ENTRY_SKILL);
    return [(await deps.role.load()).trim(), "", buildContextPrompt(entry, catalogue)].join("\n");
  }

  const act = async (state: typeof Consultation.State) => {
    const system = await systemPrompt();
    const user = state.note ? `${state.request}\n\n[Note] ${state.note}` : state.request;
    const reply = await deps.agent.chat({
      system,
      user,
      threadId: state.threadId,
      provider: deps.config.provider,
      model: deps.config.model,
      memory: deps.config.memory,
    });
    return { reply: reply.text, threadId: reply.threadId };
  };

  const refine = (state: typeof Consultation.State) => ({
    note: "Ask exactly ONE question in your next reply. Do not list multiple questions. Keep it short.",
    revisions: (state.revisions ?? 0) + 1,
  });

  const gate = async (state: typeof Consultation.State) => {
    const answers = await deps.classifier
      .classify({ text: state.reply, questions: GATE_QUESTIONS })
      .catch(() => ({}) as Record<string, unknown>);
    return { verdict: evaluateGate(answers) };
  };

  const revise = (state: typeof Consultation.State) => ({
    note: `Your last reply was flagged (${state.verdict?.reasons.join("; ") ?? "unsafe"}). Exclude every allergen, use only safe local food, and stay concise.`,
    revisions: (state.revisions ?? 0) + 1,
  });

  // Only runs after the gate passes. A separate, memory-free turn keeps the consultation
  // thread clean; the reply is returned as `summary` while the full text stays in `reply`.
  const summarize = async (state: typeof Consultation.State) => {
    const result = await deps.agent.chat({
      system: SUMMARIZE_PROMPT,
      user: state.reply,
      provider: deps.config.provider,
      model: deps.config.model,
      memory: "off",
    });
    return { summary: result.text.trim() };
  };

  // Branch: a wall of questions -> refine; a single question -> end; prose -> gate.
  const afterAct = (state: typeof Consultation.State): string => {
    const questions = questionCount(state.reply);
    if (questions > 1 && (state.revisions ?? 0) < MAX_REVISIONS) return "refine";
    if (questions >= 1) return END;
    return deps.config.classifyMode === "off" ? END : "gate";
  };

  const afterGate = (state: typeof Consultation.State): string => {
    const status = state.verdict?.status;
    if (status === "flagged" && (state.revisions ?? 0) < MAX_REVISIONS) return "revise";
    if (status === "pass" && deps.config.summarize) return "summarize";
    return END;
  };

  return new StateGraph(Consultation)
    .addNode("act", act)
    .addNode("refine", refine)
    .addNode("gate", gate)
    .addNode("revise", revise)
    .addNode("summarize", summarize)
    .addEdge(START, "act")
    .addConditionalEdges("act", afterAct, ["refine", "gate", END])
    .addEdge("refine", "act")
    .addConditionalEdges("gate", afterGate, ["revise", "summarize", END])
    .addEdge("revise", "act")
    .addEdge("summarize", END)
    .compile();
}
