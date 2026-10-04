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

// Open-weight model presets, served via Backboard's providers. `MODEL_PRESET` overrides
// provider/model. `gemma` targets Google's open-weight Gemma.
const PRESETS: Record<string, { provider: string; model: string }> = {
  gemma: { provider: "openrouter", model: "google/gemma-3-27b-it" },
  qwen: { provider: "cerebras", model: "qwen/qwen3-235b-a22b-2507" },
  llama: { provider: "cerebras", model: "meta-llama/llama-3.1-8b-instruct" },
  gptoss: { provider: "cerebras", model: "openai/gpt-oss-120b" },
};

export const config = {
  port: Number(env("PORT", "8787")),
  provider: env("LLM_PROVIDER", "cerebras"),
  backboardApiKey: process.env.BACKBOARD_API_KEY ?? "",
  backboardModel: env("BACKBOARD_MODEL", "openai/gpt-oss-120b"),
  memory: env("BACKBOARD_MEMORY", "Auto"),
  classifyMode: env("CLASSIFY", "gate") as ClassifyMode,

  // Observability (Sentry agent tracing). Strip quotes in case .env wraps the value.
  sentryDsn: (process.env.SENTRY_DSN ?? "").replace(/^["']|["']$/g, ""),

  // Voice narration (ElevenLabs).
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  elevenLabsVoiceId: env("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"),
  elevenLabsModel: env("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
} as const;

export function agentConfig(): AgentConfig {
  const preset = PRESETS[env("MODEL_PRESET", "")];
  return {
    provider: preset?.provider ?? config.provider,
    model: preset?.model ?? config.backboardModel,
    memory: config.memory,
    classifyMode: config.classifyMode,
  };
}
