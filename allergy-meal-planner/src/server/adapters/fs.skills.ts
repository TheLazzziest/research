import path from "node:path";
import { loadSkillRegistry, type Skill } from "../skill.ts";
import type { SkillRepository } from "../domain/ports.ts";

// Adapter: load the context graph from a filesystem skills directory.
export class FsSkillRepository implements SkillRepository {
  constructor(private readonly skillsDir: string) {}

  async load(entryName: string): Promise<Map<string, Skill>> {
    return loadSkillRegistry(path.join(this.skillsDir, entryName));
  }
}
