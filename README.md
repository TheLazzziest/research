# research

A sandbox with research projects on the **agent-skill ecosystem** — how skills are
packaged, resolved, locked, and evaluated.

- **`allergy-meal-planner/`** — a field experiment: a small voice meal planner whose
  behavior lives in a graph of skills. It is the concrete vehicle for the
  package-manager formalization this research argues for — versioned manifests,
  bare-name dependencies in `SKILL.md`, package refs in `manifest.json`, a
  content-addressable Merkle lock, and a patched `skills` CLI
  (`validate` / `lint` / `lock` / `verify` / `graph` / `resolve`).

Start with `allergy-meal-planner/README.md`; the write-up is in
`allergy-meal-planner/devto-post.md`.
