# Third-party skills and licenses

This project vendors third-party agent skills so the dependency graph is
self-contained and resolvable offline.

## cooklang/cooklang-skills

- Source: https://github.com/cooklang/cooklang-skills
- License: MIT (see `skills/LICENSE.cooklang-skills`)
- Vendored skills: `convert-recipe`, `create-recipe`, `export-recipe`,
  `manage-pantry`, `meal-plan`, `organize-collection`, `scale-recipe`,
  `search-recipes`, `shopping-list`, `validate-recipes`.
- We added a `manifest.json` to each to declare its `cookcli` tool dependency and,
  where applicable, skill dependencies.
- We added `metadata.version` and `metadata.dependencies` to each `SKILL.md`
  frontmatter, and a `manifest.json` version, so the skill's version and its graph
  edges are declared in the artifact and visible to the agent on load. The
  `SKILL.md` bodies are otherwise unmodified.

## mattpocock/skills

- Source: https://github.com/mattpocock/skills
- Skills referenced in the README and used while building:
  `writing-for-agents`, `to-questionnaire`, `grilling`, `wait-what`, `teach`.
- Installed via `npx skills add mattpocock/skills` (not vendored under `skills/`;
  see the README).
