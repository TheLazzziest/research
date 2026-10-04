---
name: allergen-screening
description: >-
  Screen a flat ingredient list against one person's allergies and return a safe list with substitutions. Use for every meal, recipe, label, or shopping list before it reaches someone with a food
  allergy.
metadata:
  version: 0.1.0
  dependencies:
    - grilling
    - teach
    - to-questionnaire
    - wait-what
    - writing-for-agents
  capabilities:
    - allergy_guard
  references:
    - references/hidden-ingredients.md
---

# Allergen Screening

Screen an ingredient list against one person's allergies. This is the safety gate:
a list leaves screening either verified safe, or changed until it is.

## Steps

1. Take the flat ingredient list and the person's allergies from the profile.
2. Call `allergyGuard` with both. Read its flags.
3. When the dish uses a processed, packaged, or restaurant-style food, read
   `references/hidden-ingredients.md` and add the hidden ingredients it names, then
   call `allergyGuard` again.
4. For each flagged ingredient, choose a substitution that keeps the dish's role
   intact, then call `allergyGuard` again.
5. Repeat step 4 until `allergyGuard` returns `safe: true`.

Done when `allergyGuard` reports `safe: true` for the final ingredient list.
