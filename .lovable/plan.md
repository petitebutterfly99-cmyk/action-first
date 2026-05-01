## Goal

Make the queue header strip ("N accounts need action · N high risk · N contacted today · N snoozed") reflect the rows actually shown in the list, instead of always counting the entire account set. The strip's wording, layout, separators, and styling stay exactly as they are — only the numbers change.

## Why the numbers look wrong

The strip currently reads from the unfiltered `accounts` array on the controller, while the rows below are rendered from `sortedAccounts` (= `accounts` filtered by the active **Risk Level** and **Queue Status** toggles). So when a CSM filters the list, the headline counts and the visible rows disagree.

Example with the user's scenario:
- 50 high-risk accounts exist in total → strip shows "50 high risk".
- But filters narrow the visible list to a smaller subset → rows shown ≠ 50.

## Fix

In `src/features/action-queue/hooks/useActionQueueController.ts`, derive the four header counts from `sortedAccounts` (the same memoized list that feeds the row renderer) instead of `accounts`:

- `needsActionCount` → `sortedAccounts.filter(a => a.status === "needs_action" && a.risk !== "low").length`
- `highRiskVisibleCount` (new exported field) → `sortedAccounts.filter(a => a.risk === "high").length`
- `contactedTodayCount` → `countContactedToday(sortedAccounts)`
- `snoozedCount` → `sortedAccounts.filter(a => a.status === "snoozed").length`

Then in `src/features/action-queue/components/ActionQueuePage.tsx`, swap the inline `c.accounts.filter(a => a.risk === "high").length` for the new `c.highRiskVisibleCount`. No JSX, copy, or styling changes.

## Things explicitly NOT changed

- KPI cards above the list (handled separately by `useMetrics`) — untouched.
- Risk Level / Queue Status filter toggle counts — untouched.
- `riskCounts` / `statusCounts` exports used elsewhere (e.g. hero "N high-risk waiting", guided tour) — untouched, still based on the full account set so the hero still shows the true total.
- Strip's text, separators, ordering, classes, and the "snoozed" conditional rendering rule.

## Files touched

- `src/features/action-queue/hooks/useActionQueueController.ts` — change the four count derivations + add `highRiskVisibleCount` to the returned object.
- `src/features/action-queue/components/ActionQueuePage.tsx` — replace the one inline filter expression with `c.highRiskVisibleCount`.

Approve to implement?