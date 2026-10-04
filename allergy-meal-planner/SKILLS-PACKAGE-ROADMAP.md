# Enriching `skills` into a showcase package manager

Goal: turn the `skills` CLI (pinned `1.7.0` + our `lint`/`validate`/`sync-deps`
patches) into a reference **sample** that shows a skill graph as a package closure —
resolve, lock, hash, order, provision, verify. That is the substrate an evaluator like
AEVAL can depend on.

Source of the capability list: the ecosystem survey (`SKILL-GRAPH-ECOSYSTEM.md` §4).

## Status

**P0 done** — patch `05-graph-lock` adds `skills lock` (topological closure +
**content-addressable Merkle lock**) and `skills verify` (frozen gate). `install` is
taken upstream by `add`, so the writer verb is `lock`. The lock uses the `skills` CLI
convention: the `skills` map holds remote (`skills add`) + local + external skills, and
the `graph` block holds only closure metadata. A local node's Merkle `hash` folds its
version + content + dependency hashes; references are `source@sha256:<hex>` locators
(`skills/<name>@sha256:…`; external `git+<location>@<ref>#<name>@sha256:…`). Bumping any
package's version propagates to every dependent and to `graphHash`.

**P0.5 done** — patch `06-package-lint` makes `skills lint` enforce the package
contract: `manifest.json` required (carries `version` independent of deps), `SKILL.md`
`metadata.version` must mirror it (regression identity), declared references must
exist, body links must be declared, and lint runs **pluggable hooks**
(`skills.hooks.json`) so multi-language scripts are checked by per-language tools.

**P1 done** — patch `07-graph` adds graph introspection: `skills graph`
(`--mermaid`/`--dot`/`--json`), `skills lineage <a> <b>`, `skills impact <node>`, and
orphan detection. Cycle detection now uses **Tarjan SCC** (component condensation),
which is the structure multi-factor evaluation needs for a load/eval order.

Edge `weight` fields were **removed** from manifests: a dependency edge is binary, and
weights silently conflate the dependency graph with the context/routing graph.

```
✓ skills lock    12 skill(s)  order: allergen-screening -> ... -> allergy-safe-meal-planning
                 closure 88a59f8ab85e  workspace 7b88c8aee3a7
✓ skills verify  graph matches lock
✗ drift          3 changes -> exit 2      (missing lock -> 3, graph error -> 1)
```

## Where `skills@1.7.0` stands today

| Capability | `skills` (1.7.0 + patch) | Evidence in `dist/cli.mjs` |
|---|---|---|
| Manifest | partial — `SKILL.md` + optional sibling `manifest.json` | `readSkillDeps` reads `manifest.json` deps (patch) |
| Lockfile | **yes** — `skills-lock.json` v1, sorted, portable local sources | `LOCAL_LOCK_FILE`, `writeLocalLock` |
| Transitive resolve | partial — `sync-deps` installs declared `git:` deps, one hop | `runSyncExternal` (patch) |
| Topo install order | no | — |
| Cycle detect | **yes** — local `file:` deps | `runValidate` (patch) |
| Orphan detect | no | — |
| Integrity hash | **yes** — `sha256:<hex>` per artifact; folder hash over sorted files | `computeDigest`, `computeSkillFolderHash` |
| Signing | no | — |
| Graph viz | no (in-package) | — |
| Query `why`/`impact` | no | — |
| Edge inference | no — deps are declared | — |
| Multi-agent install | **yes** — fans out to many agent dirs | `runAdd` |
| CI `--frozen` | no — restore exists, no assert | `experimental_install` |
| Nested skills | partial — `--full-depth` search | `parseAddOptions` |
| MCP/rules lock | no | — |

**One line:** `skills` is a strong *installer + lockfile*, weak on the *graph* and
*graph-aware provisioning*. That is exactly the layer this ecosystem is about, and the
layer evaluation needs to stand on.

## Gaps that block the showcase

1. **No graph closure.** The lock records installed skills, not the resolved
   dependency closure. Nothing computes `A → B → C` across `file:`/`git:` refs.
2. **No ordering.** Install order is the order you typed. A shared dependency
   (`validate-recipes`, `scale-recipe` in our graph) has no single install position.
3. **Integrity stops at the node.** Per-skill digest exists; there is no *closure
   hash* or *workspace hash*, so "the same graph" is not a checkable claim.
4. **No freeze gate.** Restore exists; a CI assertion "the lock matches the manifests
   and hashes" does not.
5. **No graph surface.** No render, no `why`, no `impact`, no orphan/reachability.

## Enrichment roadmap

### P0 — make the closure first-class — **done** (`05-graph-lock`)
- **`skills lock`** — resolve the full graph from manifests in **topological order**,
  over `file:` / `git:` / `capability:` refs. Reuses `parseDepRef` + `readSkillDeps`.
  (Named `lock`, not `install`: upstream `add` already owns `install`.)
- **Closure integrity** — `skills-lock.json` gains a `graph` section: per-node
  `contentHash`, `closureHash` (hash over the sorted resolved set), `workspaceHash`.
- **`skills verify --frozen`** — asserts on-disk hashes match the lock; fail-closed exit
  codes: `0` ok, `2` drift, `3` missing lock, `1` graph error. `lock --frozen` aliases it.

### P1 — make the graph visible
- **`skills graph [--mermaid|--dot|--json]`** — render the resolved graph.
- **`skills lineage <a> <b>`** — edge-typed path between nodes (`--all` / `--reverse` / `--json`).
- **`skills impact <node>`** — reverse reachability (what depends on this).
- **Orphan + reachability** in `skills validate` (unreachable skills = error under `--strict`).

### P2 — provenance and runtime
- **`git:` deps** — **done**: resolved + content-addressed as `sourceType: "git"` entries and
  `git+<location>@<ref>#<name>@sha256:<hash>` references (declared pin; not fetched).
- **Unified lock** — **done**: the `skills` map holds remote (`skills add`) + local +
  external entries (CLI convention); `graph` holds only closure metadata.
- **`skills lock --sign`** — ed25519 sign the lock; verify on install.
- **Capability lock** — record `capability:` deps and preflight runtime tool availability.
- **Nested skills** — recursive `skills/*/skills/*` with bounded depth.
- **MCP/rules lock** — pin shared agent config alongside skills.

## Matrix diff (what the showcase would move)

| Capability | now | target |
|---|---|---|
| Transitive resolve | partial | ✓ local closure resolved (`git:` closure P2) |
| Topo install order | ✓ `skills lock` | — |
| Orphan detect | — | ✓ `validate --strict` |
| Signing | — | ✓ `lock --sign` (P2) |
| Graph viz | — | ✓ `skills graph` |
| Query why/impact | — | ✓ `skills why` / `impact` |
| CI `--frozen` | ✓ `skills verify --frozen` | — |
| Nested skills | partial | ✓ recursive |
| MCP/rules lock | — | ✓ (P2) |

That takes `skills` from "installer" to the only tool in the matrix covering
**resolve + lock + hash + order + graph + freeze** in one place.

## Showcase run (what the demo executes)

On this repo's 12-node graph:

```bash
bun run skills:validate    # graph scheme, file: existence, cycles          (have)
bun run skills:lint        # SKILL.md frontmatter                           (have)
bun run skills:lock        # topo closure + hashes -> skills-lock.json      (P0, done)
bun run skills:verify      # frozen gate (exit 2 on drift)                  (P0, done)
bun node_modules/skills/bin/cli.mjs graph --skills-dir skills --mermaid     # (P1)
```

Then run the agent and the eval to show the provisioned graph producing a reproducible
signal — the hand-off to AEVAL-style evaluation.

## Why this is the right sample

The dev.to thesis is that evaluation needs a package-manager layer it can trust.
`skills` already has the hard half (lockfile + content hashing + multi-agent install).
Finishing the graph half turns it into the reference supply chain: a named, pinned,
reproducible artifact that a statistical gate can consume.

## Priority

P0 (closure + integrity + freeze) makes the sample. P1 (graph surface) makes it a good
demo. P2 (signing, capability/MCP lock, nesting) makes it production-credible.
