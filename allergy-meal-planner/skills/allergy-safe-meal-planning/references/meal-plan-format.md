# Meal plan output format

Reached from step 7 when emitting the plan. Short and scannable. No filler.

## Shape

```
Safety: screened against <allergies> — all meals pass.
```

Then, per meal:

```
### <Day> — <Meal name>
- <ingredient>
- <ingredient>
Substitution: <what changed and why>.   (only when a swap happened)
```

Then a shopping list of only what is missing from the pantry:

```
### Shopping list
- <item>
```

End with the allergens actively screened against and any cross-contamination note:

```
Screened: peanut, tree nuts, shellfish
Watch: <shared equipment or "may contain" notes, if any>
```

## Rules

- Lead with the safety line, before any meal.
- One meal section per day; keep ingredient lists flat.
- Mark a substitution inline, not in a separate section.
- List only ingredients that passed `allergen-screening`.
