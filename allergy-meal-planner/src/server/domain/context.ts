import type { Skill } from "../skill.ts";
import { preflight } from "../capabilities.ts";

// The context-graph section appended to the role document. The role itself comes from
// AGENTS.md; this only adds what the agent may load and which capabilities exist.
export function buildContextPrompt(entry: Skill, catalogue: string[]): string {
  const capabilities =
    preflight(entry.capabilities)
      .map((cap) => `${cap.name} (${cap.available ? "available" : cap.detail})`)
      .join(", ") || "none";

  return [
    "## Context (skill graph)",
    "",
    entry.body,
    "",
    `Requires: ${entry.dependencies.map((dep) => dep.name).join(", ") || "none"}`,
    `Capabilities: ${capabilities}`,
    `Available skills: ${catalogue.join(", ") || "none"}`,
  ].join("\n");
}
