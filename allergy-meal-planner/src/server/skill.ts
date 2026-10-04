import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseSkillDocument } from "agent-skills-ts-sdk";
import type { Capability } from "./capabilities.ts";

export type DependencyType = "skill" | "script" | "tool";

export interface SkillDependency {
  name: string;
  type: DependencyType;
  source: string;
}

export interface Skill {
  name: string;
  description: string;
  version: string | null;
  body: string;
  dir: string;
  references: string[];
  capabilities: Capability[];
  dependencies: SkillDependency[];
}

// The harness resolves the CONTEXT graph — what the LLM may load — from SKILL.md
// frontmatter only. Parsing is delegated to the Agent Skills SDK; the dependency graph
// (manifest.json) is the CLI's job.
function namesOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string") {
        return (entry as { name: string }).name;
      }
      return null;
    })
    .filter((name): name is string => typeof name === "string");
}

export async function loadSkill(dir: string): Promise<Skill> {
  const raw = await readFile(path.join(dir, "SKILL.md"), "utf8");
  const { metadata, body } = parseSkillDocument(raw) as { metadata: Record<string, unknown>; body: string };
  const meta = (metadata.metadata ?? {}) as Record<string, unknown>;
  const dependencies: SkillDependency[] = namesOf(meta.dependencies ?? meta["depends-on"]).map((name) => ({
    name,
    type: "skill",
    source: name,
  }));
  return {
    name: String(metadata.name ?? path.basename(dir)),
    description: String(metadata.description ?? ""),
    version: typeof meta.version === "string" ? meta.version : null,
    body: body.trim(),
    dir,
    references: namesOf(meta.references),
    capabilities: namesOf(meta.capabilities).map((name) => ({ name })),
    dependencies,
  };
}

export async function loadSkillRegistry(entryDir: string): Promise<Map<string, Skill>> {
  const skillsRoot = path.dirname(path.resolve(entryDir));
  const dirs = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsRoot, entry.name));
  const registry = new Map<string, Skill>();
  for (const dir of dirs) {
    try {
      const skill = await loadSkill(dir);
      if (!registry.has(skill.name)) registry.set(skill.name, skill);
    } catch {
      // not a skill directory
    }
  }
  return registry;
}

export async function readReference(skill: Skill, relPath: string): Promise<string> {
  const clean = relPath.replace(/^\.?\//, "");
  if (!skill.references.includes(clean)) {
    throw new Error(`unknown reference: ${relPath}`);
  }
  const root = path.resolve(skill.dir);
  const target = path.resolve(root, clean);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`reference escapes skill dir: ${relPath}`);
  }
  return readFile(target, "utf8");
}
