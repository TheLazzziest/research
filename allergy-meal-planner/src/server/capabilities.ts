import { spawnSync } from "node:child_process";

// A capability is a declaration of need, not an implementation. The skill says
// what it needs and (optionally) how to check it; the environment decides how to
// provide and invoke it. `probe` is a shell command that exits 0 when available.
export interface Capability {
  name: string;
  probe?: string;
}

export interface CapabilityStatus extends Capability {
  available: boolean;
  detail: string;
}

export function preflight(capabilities: Capability[]): CapabilityStatus[] {
  return capabilities.map((cap) => {
    if (!cap.probe) {
      return { ...cap, available: true, detail: "delegated to environment" };
    }
    const result = spawnSync("sh", ["-c", cap.probe], { encoding: "utf8" });
    return { ...cap, available: result.status === 0, detail: cap.probe };
  });
}
