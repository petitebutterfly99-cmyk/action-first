## Fix Guide 7 → 8 transition

When the user clicks "Open send dialog" on Guide 7, the popover currently re-renders Guide 7 instead of advancing to Guide 8. Root cause is a race between the explicit `goTo("outreach_modal")` and the existing detail-panel auto-advance effect: the AccountDetailPanel stays mounted with the same `selectedAccount`, so on the next render the auto-advance effect can fire and snap the tour back to `detail_panel` (step 7).

### Change

In `src/features/action-queue/components/ActionQueuePage.tsx`, update the `onNext` handler for the `detail_panel` step so a single click does three things in one batched update:

1. Close the detail panel (`c.setSelectedAccount(null)`) — this prevents the detail-panel auto-advance effect from re-triggering after the transition.
2. Open the outreach modal (`c.setOutreachAccount(target)`).
3. Advance the tour (`guided.goTo("outreach_modal")`).

Also tighten the auto-advance effect that promotes the tour to `detail_panel`: it should only fire while the tour is still on an "earlier than detail_panel" step. Concretely: instead of "step is anything except detail_panel/outreach_modal/success", check the step's index against `TOUR_STEPS.indexOf("detail_panel")` and only promote when the current step is *before* detail_panel. This prevents the effect from re-firing after the user has already moved past step 7.

### Files

- `src/features/action-queue/components/ActionQueuePage.tsx` — update the detail_panel branch of `onNext` and tighten the two `useEffect` blocks that auto-advance the tour based on `selectedAccount` / `outreachAccount`.

### Out of scope

No new steps, no copy changes, no new refs.