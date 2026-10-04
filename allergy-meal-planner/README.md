# Skill graphs, not models

### A field experiment: where does an agent's guarantee actually live?

The app is small on purpose: a voice-driven meal planner built for one friend with
real food allergies (Hacktoberfest, *Build for a Friend*). The experiment is larger:
whether the trustworthy part of an agent can live in an explicit graph of skills
rather than in the model.

## The idea

An agent's competence is a graph, not a prompt. Nodes are skills; edges are skill
dependencies (one skill requiring another). Capabilities — tools a skill needs, like the
allergen screen — are a separate, non-installed surface. The graph is the thing you read,
version, and vendor.

## The hypothesis

**Behavior that matters is carried by the graph, not the model.** So:

- swapping LLM models (including open-weight ones) changes style, not the safety outcome;
- loading reference material on demand keeps context bounded regardless of model;
- a graph with no registry resolves from vendored files and runs anywhere.

If that holds, the guarantee is model-independent: an open-weight model behind any
adapter should do. Delivery here runs on the **Backboard adapter** over open-weight
models (`cerebras`, `openrouter`, `featherless`); the graph, not the model, is what we
hold fixed.

## Why it matters

Language models only help for real work if you can trust them where the stakes are. Where that trust comes from is the question. If it comes from the model itself, an open model is *cheap but a gamble* — nothing outside it vouches for the result. If it comes from a graph you can read, version, and vendor, the model only has to be good enough, and it stays swappable. That difference is the whole open-innovation claim. This experiment tries to locate the trust precisely.

## Why this test

A friend with a food allergy is a good falsifier: a wrong ingredient is a safety event, not a style miss. The task also composes naturally — pantry, portion scaling, recipes, shopping, and a screen that must not depend on the model — so the graph has real edges instead of decorative ones. It is small enough to run end to end and strict enough to break the hypothesis if the hypothesis is wrong.

## The fixed part and the variable

The hypothesis is about what controls behavior, so the test changes one thing and holds
the rest.

- **Fixed: the graph.** The same skill nodes, the same edges, the same deterministic
  screen.
- **Variable: the model.** Swap the model under the graph. If behavior follows the
  graph, it holds. If it follows the model, it moves.

An **adapter** is transport between the harness and a model — here the Backboard SDK in
front of a hosted open-weight provider. A transport must not change behavior: if the
output moves when only the provider or model changes, something load-bearing sat outside
the graph.

## Why this ecosystem exists

A skill is prose injected into a privileged agent. That makes behavior hard to hold
still: models drift, capabilities arrive as loose text, context bloats, and nothing
records which version ran. Skill infrastructure is the answer to that problem — pin
versions, hash content, order installs, disclose on demand, evaluate against a
baseline. The goal is one thing: **make agent behavior a controlled function of
versioned inputs.**

This experiment asks whether the graph delivers that on a small, strict case. Can an
explicit graph carry a safety guarantee that does not move when the model moves?

## What would falsify it

- The allergen screen returns a different outcome under different models.
- The output changes when only the adapter changes, and nothing else.
- A trivial request pulls the whole graph into context anyway.
- The graph fails to resolve without a registry.
- The decoupled screen cannot be reused by an unrelated consumer.

## Status

The graph resolves, locks, and verifies, and the planner runs through the Backboard
adapter. That adapter is prompt-only: it sends the context graph as a system prompt but
does not execute local tools, so the deterministic screen is *described*, not *enforced*
at runtime. That is the honest gap this experiment records — the guarantee lives in the
skill graph and the CLI (lock/verify/lint), while delivery over a hosted adapter is where
enforcement can leak. Swapping the model under a fixed graph is the next test.

## Run

```bash
cp .env.example .env          # set BACKBOARD_API_KEY
bun install

bun run plan "plan 4 dinners this week"   # flags: --provider, --model
bun run dev                               # voice UI on http://localhost:8787
bun run skills:graph                      # render the dependency graph
bun run skills:verify                     # verify the content-addressable lock
```
