import type { Skill } from "../skill.ts";

export interface AgentReply {
  text: string;
  provider: string;
  model: string;
  threadId?: string;
}

export interface AgentTurn {
  system: string;
  user: string;
  threadId?: string;
  provider: string;
  model: string;
  memory: string;
}

// Port: how the service talks to an LLM. (DIP)
export interface AgentPort {
  chat(turn: AgentTurn): Promise<AgentReply>;
}

// Port: how the service loads the context graph. (DIP)
export interface SkillRepository {
  load(entryName: string): Promise<Map<string, Skill>>;
}

// Port: the agent's role is a document, not code.
export interface RoleProvider {
  load(): Promise<string>;
}

export type ClassificationQuestions = Record<string, unknown>;
export type ClassificationAnswers = Record<string, unknown>;

// Port: System One (Jev) typed classification — decisions/scores, not prose.
export interface ClassifierPort {
  classify(input: { text: string; questions: ClassificationQuestions }): Promise<ClassificationAnswers>;
}

export interface TtsResult {
  audio: Uint8Array;
  contentType: string;
}

// Port: voice narration (text -> audio). Adapter: ElevenLabs.
export interface TtsPort {
  synthesize(text: string): Promise<TtsResult>;
}
