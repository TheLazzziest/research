function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export type ClassifyMode = "off" | "each" | "gate";

export interface AgentConfig {
  provider: string;
  model: string;
  memory: string;
  classifyMode: ClassifyMode;
}

export const config = {
  port: Number(env("PORT", "8787")),
  provider: env("LLM_PROVIDER", "cerebras"),
  backboardApiKey: process.env.BACKBOARD_API_KEY ?? "",
  backboardModel: env("BACKBOARD_MODEL", "openai/gpt-oss-120b"),
  memory: env("BACKBOARD_MEMORY", "Auto"),
  classifyMode: env("CLASSIFY", "gate") as ClassifyMode,
} as const;

export function agentConfig(): AgentConfig {
  return {
    provider: config.provider,
    model: config.backboardModel,
    memory: config.memory,
    classifyMode: config.classifyMode,
  };
}
