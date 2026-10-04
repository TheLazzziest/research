import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.ts";
import { createContainer } from "./di/bootstrap.ts";
import { tokens } from "./di/tokens.ts";
import type { AgentService } from "./domain/agent.service.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));
const staticDir = path.join(root, "dist", "client");
const service = createContainer(root).resolve<AgentService>(tokens.agentService);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function sendFile(res: ServerResponse, filePath: string): Promise<boolean> {
  try {
    if (!(await stat(filePath)).isFile()) return false;
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[path.extname(filePath)] ?? "application/octet-stream" });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  let data = "";
  for await (const chunk of req) data += chunk;
  return data;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, provider: config.provider, model: config.backboardModel });
    }

    if (req.method === "POST" && url.pathname === "/api/plan") {
      const body = JSON.parse((await readBody(req)) || "{}") as { text?: unknown; threadId?: unknown };
      if (typeof body.text !== "string" || body.text.trim().length === 0) {
        return sendJson(res, 400, { error: "text is required" });
      }
      const threadId = typeof body.threadId === "string" ? body.threadId : undefined;
      return sendJson(res, 200, await service.plan({ text: body.text, threadId }));
    }

    if (req.method === "GET") {
      const rel = url.pathname === "/" ? "/index.html" : url.pathname;
      const target = path.join(staticDir, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
      if (target.startsWith(staticDir) && (await sendFile(res, target))) return;
      if (await sendFile(res, path.join(staticDir, "index.html"))) return;
      res.writeHead(404);
      return res.end("not found");
    }

    res.writeHead(405);
    res.end("method not allowed");
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "unknown error" });
  }
});

server.listen(config.port, () => {
  console.log(`allergy-meal-planner on http://localhost:${config.port}  (${config.provider}/${config.backboardModel})`);
});
