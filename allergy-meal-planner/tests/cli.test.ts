import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dir, "..");
const CLI = path.join(ROOT, "node_modules", "skills", "bin", "cli.mjs");

interface Run {
  code: number;
  out: string;
}

function skill(args: string[], cwd = ROOT): Run {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
    return { code: 0, out };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

// --- read-only commands against the real graph ---
describe("read commands (real skills/)", () => {
  test("validate passes", () => {
    const r = skill(["validate", "--skills-dir", "skills"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("OK");
  });

  test("lint passes", () => {
    const r = skill(["lint", "skills"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("ok");
  });

  test("graph renders", () => {
    const r = skill(["graph", "--skills-dir", "skills"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("nodes=");
  });

  test("lineage shows an edge-typed path", () => {
    const r = skill(["lineage", "allergy-safe-meal-planning", "validate-recipes", "--skills-dir", "skills"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("allergy-safe-meal-planning");
    expect(r.out).toContain("-[skill]->");
  });

  test("lineage annotates remote edges", () => {
    const r = skill(["lineage", "allergy-safe-meal-planning", "writing-for-agents", "--skills-dir", "skills"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("-[remote");
  });

  test("lineage rejects a missing path", () => {
    const r = skill(["lineage", "validate-recipes", "allergy-safe-meal-planning", "--skills-dir", "skills"]);
    expect(r.code).toBe(1);
  });

  test("impact lists dependents", () => {
    const r = skill(["impact", "writing-for-agents", "--skills-dir", "skills"]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/depend/);
  });

  test("verify matches the committed lock", () => {
    const r = skill(["verify", "--skills-dir", "skills"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("graph matches lock");
  });
});

// --- mutation commands against an isolated fixture ---
describe("mutation commands (fixture)", () => {
  let fixture: string;

  const writeSkill = (name: string, deps: { name: string; type: string }[] = []) => {
    const dir = path.join(fixture, name);
    mkdirSync(dir, { recursive: true });
    const manifest = {
      $schema: "../../manifest.schema.json",
      name,
      version: "0.1.0",
      tags: ["test"],
      dependencies: deps.map((d) => ({ ...d, path: `skills/${d.name}`, version: "0.1.0" })),
      capabilities: [],
    };
    writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const frontmatter = {
      name,
      description: `${name} test skill`,
      metadata: { version: "0.1.0", dependencies: deps.map((d) => d.name), capabilities: [], references: [] },
    };
    writeFileSync(path.join(dir, "SKILL.md"), `---\n${yaml.dump(frontmatter).trimEnd()}\n---\n\n# ${name}\n`);
  };

  const manifest = (name: string) => JSON.parse(readFileSync(path.join(fixture, name, "manifest.json"), "utf8"));
  const frontmatterNames = (name: string) => {
    const raw = readFileSync(path.join(fixture, name, "SKILL.md"), "utf8");
    const yamlText = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1];
    return (yaml.load(yamlText) as { metadata: { dependencies: string[] } }).metadata.dependencies;
  };

  beforeAll(() => {
    fixture = mkdtempSync(path.join(tmpdir(), "skills-cli-test-"));
    writeSkill("a");
    writeSkill("b");
    const r = skill(["lock", "--skills-dir", fixture]);
    expect(r.code).toBe(0);
  });

  afterAll(() => rmSync(fixture, { recursive: true, force: true }));

  test("lock writes and verify accepts", () => {
    expect(skill(["verify", "--skills-dir", fixture]).code).toBe(0);
  });

  test("deps add writes both resources", () => {
    const r = skill(["deps", "add", "a", "b", "--local", "--skills-dir", fixture]);
    expect(r.code).toBe(0);
    expect(manifest("a").dependencies.some((d: { name: string }) => d.name === "b")).toBe(true);
    expect(frontmatterNames("a")).toContain("b");
  });

  test("deps add rejects a cycle and restores files", () => {
    const before = readFileSync(path.join(fixture, "b", "manifest.json"), "utf8");
    const r = skill(["deps", "add", "b", "a", "--local", "--skills-dir", fixture]);
    expect(r.code).toBe(1);
    expect(readFileSync(path.join(fixture, "b", "manifest.json"), "utf8")).toBe(before);
  });

  test("deps add records a pinned remote ref", () => {
    const ref = "4dd886b0196bf43729d954ae326016f2bd9f5f79d892500b407c33a753362f14";
    const r = skill(["deps", "add", "a", "grilling", "--repo", "github.com/mattpocock/skills", "--path", "skills/productivity/grilling", "--ref", ref, "--skills-dir", fixture]);
    expect(r.code).toBe(0);
    const dep = manifest("a").dependencies.find((d: { name: string }) => d.name === "grilling");
    expect(dep.repo).toBe("github.com/mattpocock/skills");
    expect(dep.ref).toBe(ref);
    expect(dep.integrity).toBe(`sha256:${ref}`);
  });

  test("deps rm removes from both resources", () => {
    const r = skill(["deps", "rm", "a", "b", "--skills-dir", fixture]);
    expect(r.code).toBe(0);
    expect(manifest("a").dependencies.some((d: { name: string }) => d.name === "b")).toBe(false);
    expect(frontmatterNames("a")).not.toContain("b");
  });

  test("caps add/rm writes both resources", () => {
    expect(skill(["caps", "add", "a", "tool_x", "--probe", "true", "--skills-dir", fixture]).code).toBe(0);
    expect(manifest("a").capabilities.some((c: { name: string }) => c.name === "tool_x")).toBe(true);
    expect(skill(["caps", "rm", "a", "tool_x", "--skills-dir", fixture]).code).toBe(0);
    expect(manifest("a").capabilities.some((c: { name: string }) => c.name === "tool_x")).toBe(false);
  });

  test("deps sync reports no drift on a consistent fixture", () => {
    const r = skill(["deps", "sync", "--all", "--skills-dir", fixture]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("synced 0");
  });

  test(
    "sync-deps links local skills into the agent store",
    () => {
      // Drop the git dep added by the remote-ref test so sync-deps stays offline.
      skill(["deps", "rm", "a", "grilling", "--skills-dir", fixture]);
      const r = skill(["sync-deps", "--skills-dir", fixture], fixture);
      expect(r.code).toBe(0);
      const link = path.join(fixture, ".agents", "skills", "a");
      expect(existsSync(link)).toBe(true);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
    },
    20_000,
  );
});
