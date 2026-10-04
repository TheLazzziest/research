# Allergy-safe meal planner

A voice-driven meal planner built **for one friend with real food allergies**
(Hacktoberfest 2026, *Build for a Friend*). Its behaviour lives in a **versioned skill
graph**, not in the model; delivery runs on open-weight models through the Backboard
adapter. The app is the probe — see the dev.to post for the idea. This file is the tech.

## Two resources, two resolvers

A skill lives in two files with two jobs. They must not cross: the CLI resolves the
dependency graph; the LLM resolves the context graph.

`manifest.json` — the package (CLI-resolved):

```jsonc
{
  "name": "shopping-list",
  "version": "0.1.0",
  "source": "file:skills/shopping-list",
  "dependencies": [
    { "name": "scale-recipe", "type": "skill", "path": "skills/scale-recipe", "version": "0.1.0" },
    { "name": "grilling", "type": "skill",
      "repo": "github.com/mattpocock/skills",
      "path": "skills/productivity/grilling",
      "ref": "4dd886b0…", "integrity": "sha256:4dd886b0…" }
  ],
  "capabilities": [ { "name": "cookcli", "probe": "cook --version" } ]
}
```

`SKILL.md` frontmatter — the context (LLM-resolved):

```yaml
---
name: shopping-list
description: Turn chosen recipes into one consolidated shopping list.
metadata:
  version: 0.1.0
  dependencies: [scale-recipe, export-recipe, grilling, teach, to-questionnaire, wait-what, writing-for-agents]
  capabilities: [cookcli]
  references: [references/format.md]
---
```

Rules: `dependencies` are **skills only**; tools are **capabilities**; `references` are
context; `version` lives in both and must mirror; `source` records where *this* skill came
from (`file:` locally, `git:<repo>@<ref>` when published). Schemas:
`manifest.schema.json`, `hooks.schema.json`.

## Capabilities are needs, not implementations

A capability declares a need and, optionally, a probe. The environment decides how to
provide and invoke it (MCP server, binary, Python/Rust script, HTTP API). `cookcli` is
`probe: "cook --version"`; `allergy_guard` is host-provided (no probe → delegated).

## The content-addressable lock

`skills lock` resolves the dependency graph, hashes each skill's content, and writes a
**Merkle** lock: a node's hash folds its version, content, and its dependencies' hashes. A
reference is a locator plus a digest:

```
skills/scale-recipe@sha256:6e470856…
git+github.com/mattpocock/skills@4dd886b0…#grilling@sha256:4dd886b0…
```

Change one skill → its hash, every dependent's hash, and the root `graphHash` move.
`skills verify --frozen` fails closed: `0` ok, `2` drift, `3` missing lock, `1` error.

## The `skills` CLI (pinned `1.7.0` + a patch series)

The CLI is patched by a reviewable series (`patches/skills/*.patch`, applied by
`scripts/apply-patches.mjs` on install):

```
validate  ·  lint  ·  sync-deps  ·  lock  ·  verify
graph (--mermaid|--dot|--json)  ·  lineage (--all|--reverse|--json)  ·  impact
deps add|rm|list|sync  ·  caps add|rm
```

- `deps`/`caps` edit **both resources** in one step, reject cycles (restoring files), and
  re-lock.
- `lineage <a> <b>` prints an edge-typed path; `impact <node>` is reverse reachability —
  the blast radius.
- `add`/`sync` symlink local skills into `.agents/skills` (one entry point) while
  `skills/` stays the source of truth.

## The agent runtime

- **Role** — read from `AGENTS.md` (`FsRoleProvider`), not code. Edit the doc, the agent
  changes.
- **Harness** — DDD-lite Clean Architecture: `domain/` (ports + `AgentService` +
  LangGraph `controller.ts`), `adapters/` (`backboard.agent`, `backboard.classifier`,
  `fs.role`, `fs.skills`), `di/` (`bootstrap.ts` composition root + `tokens`), shared
  `Container`. All dependencies point at ports.
- **Controller** — a LangGraph `StateGraph`: `act → gate → (revise) act`, plus a shape
  guard (`>1 question → refine`). The model writes content; the graph owns control flow.
- **Gatekeeper** — System One / Jev (`typesafe`, `jev-latest`) judges the reply with typed
  answers; a deterministic policy thresholds them (`allergy_safe < 0.5` → flagged).
  `CLASSIFY=off|each|gate` (default `gate`: only acting turns, so interviews cost one call).
- **Adapter** — Backboard SDK; provider/model via `LLM_PROVIDER` / `BACKBOARD_MODEL`.
  Prompt-only today: the deterministic screen is *described*, not executed, so the
  guarantee lives in the graph + CLI, not in the adapter.

## Client

React 18 + Material Tailwind + Tailwind 3, bundled with Bun (no Vite; Node 18). DI via the
shared `Container` + React context; services behind ports (`PlanService` → HTTP adapter,
`SpeechService` → Web Speech adapter). Push-to-talk (hold to talk, release to send;
Firefox falls back to Send). Answers render as Markdown; TTS reads stripped plain text.

## Layout

```
src/server/   domain/ adapters/ di/  index.ts cli.ts config.ts skill.ts capabilities.ts
src/client/   components/ di/ services/  App.tsx main.tsx ui.tsx
src/shared/   container.ts types.ts
skills/       the graph (12 local + manifest.json + SKILL.md)
patches/skills/*.patch    the CLI series
AGENTS.md     the agent's role (system prompt)
```

## Run

```bash
cp .env.example .env          # set BACKBOARD_API_KEY (and CLASSIFY if you like)
bun install                   # applies the patch series, links the agent store

bun run plan "plan 4 dinners this week"   # CLI (flags: --provider, --model, --thread)
bun run dev                               # build client + serve http://localhost:8787
bun test                                  # CLI integration tests
bun run skills:lock && bun run skills:verify
bun run skills:graph                      # render the dependency graph
```

## Hacktoberfest prize track

| Prize | How this project competes | Where |
|---|---|---|
| **ElevenLabs** | Voice narration: `/api/tts` synthesizes the plan with ElevenLabs; the client plays it and falls back to the browser voice. | `src/server/adapters/elevenlabs.tts.ts`, `src/client/services/speech.service.ts` |
| **Sentry Agent Tracing** | `gen_ai` spans around every model + classifier call, with latency; `/api/metrics` exposes runs/errors/last-call. | `src/server/telemetry.ts`, `src/server/adapters/instrumented.ts` |
| **Gemma** | `MODEL_PRESET=gemma` serves Google's open-weight Gemma (`google/gemma-3-27b-it` via the openrouter provider). | `src/server/config.ts` |
| **Entire / DevRelay** | Development session record + link. | `SESSION-LOG.md` |
| **Render** | One service hosts the agent API **and** the React client. | `render.yaml` |

```bash
# prize-track env
SENTRY_DSN=…              # tracing
ELEVENLABS_API_KEY=…      # narration (/api/tts)
MODEL_PRESET=gemma        # Gemma via provider
```

## Notes / frictions

- Bun allows **one patch per `package@version`** → a multi-change patch became a reviewable
  **series**; Bun hardlinks from its global cache, so the hook breaks the link before
  applying.
- `file:` refs mean different things to different tools (path vs bare name); we standardised
  on **bare names** in frontmatter, `path`/`repo` in the manifest.
- Lint’s checks are **pluggable hooks** (`skills.hooks.json`, pre-commit style) so
  multi-language skill scripts are checked by per-language tools.
