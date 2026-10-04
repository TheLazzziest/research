import { readFile } from "node:fs/promises";
import type { RoleProvider } from "../domain/ports.ts";

// Adapter: the role is a document (AGENTS.md), not code. Edit the doc, the agent changes.
export class FsRoleProvider implements RoleProvider {
  constructor(private readonly filePath: string) {}

  async load(): Promise<string> {
    return readFile(this.filePath, "utf8");
  }
}
