import { fileURLToPath } from "node:url";
import { createContainer } from "./di/bootstrap.ts";
import { tokens } from "./di/tokens.ts";
import type { AgentService } from "./domain/agent.service.ts";

async function readStdin(): Promise<string> {
  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

const argv = process.argv.slice(2);
let threadId: string | undefined;
const words: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--thread") threadId = argv[++i];
  else if (argv[i]) words.push(argv[i]!);
}

const arg = words.join(" ").trim();
const text = arg.length > 0 ? arg : await readStdin();
if (!text) {
  console.error('usage: bun run plan [--thread <id>] "what should we eat this week?"');
  process.exit(1);
}

const root = fileURLToPath(new URL("../..", import.meta.url));
const service = createContainer(root).resolve<AgentService>(tokens.agentService);
const result = await service.plan({ text, threadId });

console.log(result.text);
console.error(`\n[provider=${result.provider} model=${result.model} thread=${result.threadId ?? "n/a"}]`);
