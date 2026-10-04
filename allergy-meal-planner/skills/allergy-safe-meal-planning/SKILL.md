---
name: allergy-safe-meal-planning
description: Plan meals for one person with food allergies from their pantry and preferences. Use when asked what to cook, to plan meals for the week, or to adapt a recipe for an allergic eater.
metadata:
  version: 0.3.0
  dependencies:
    - allergen-screening
    - meal-plan
    - manage-pantry
    - shopping-list
    - grilling
    - teach
    - to-questionnaire
    - wait-what
    - writing-for-agents
  capabilities: []
  references:
    - references/meal-plan-format.md
---

# Allergy-Safe Meal Planning

Plan meals for one real person from their profile. The profile is the source of truth.

## Steps

1. Read the profile: allergies, diet, dislikes, household, pantry, budget, time.
2. Read the `manage-pantry` skill to learn what is already in stock.
3. Draft the week with the `meal-plan` skill; size portions for the household with
   `scale-recipe`.
4. Screen every meal with the `allergen-screening` skill. Replace flagged ingredients
   until every meal passes.
5. Build the shopping list with the `shopping-list` skill, excluding what is in stock.
6. Emit the plan in the shape of `references/meal-plan-format.md`.

Done when every meal has passed `allergen-screening` and the shopping list excludes
pantry stock.
