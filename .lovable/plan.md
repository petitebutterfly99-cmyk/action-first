## Problem

Pressing **Back** in the guided tour appears to do nothing on the later steps (especially step 7 → 6 and step 8 → 7). On the earlier steps (welcome → filters → kpi → performance → highlight_row) Back works fine because those are pure UI coachmarks with no side effects.

## Root cause

`onNext` for the later steps does more than just advance the step counter — it opens panels:

- Step 6 → 7 (`highlight_row` → `detail_panel`): calls `c.setSelectedAccount(guidedAccount)`, which opens the account detail side panel.
- Step 7 → 8 (`detail_panel` → `outreach_modal`): calls `c.setOutreachAccount(target)` and `c.setSelectedAccount(null)`, which closes the detail panel and opens the outreach modal.

`guided.back()` (in `GuidedTourContext.tsx`) only rewinds the step index — it never closes the panel that the forward step opened. Two auto-advance effects in `ActionQueuePage.tsx` (lines ~316 and ~339) then immediately re-promote the tour:

- If `selectedAccount` is still set and the new step is earlier than `detail_panel`, the effect snaps the tour forward to `detail_panel`.
- If `outreachAccount` is still set and the new step is earlier than `outreach_modal`, the effect snaps it forward to `outreach_modal`.

Net effect: Back on step 7 sets step to 6, the detail panel is still open, the auto-advance effect fires, step jumps back to 7. The user sees nothing happen.

## Fix

Wire up an `onBack` handler in `ActionQueuePage.tsx` (the same place `onNext` already lives) that mirrors the forward-step side effects, then short-circuits the auto-advance effects for one render so they don't re-promote the tour.

Concretely:

1. **`src/features/action-queue/components/ActionQueuePage.tsx`** — replace the inline `onBack={guided.back}` on `<GuidedCoachmark>` (around line 852) with a handler that:
   - On `outreach_modal` (step 8) → close the outreach modal (`c.setOutreachAccount(null)`), reopen the detail panel for the guided account (`c.setSelectedAccount(guidedAccount)`), then call `guided.back()`.
   - On `detail_panel` (step 7) → close the detail panel (`c.setSelectedAccount(null)`), then call `guided.back()`.
   - On `performance` (step 5) → optionally collapse the perf panel via `setPerformanceOpen(false)` so it matches what the user saw before, then `guided.back()`.
   - On every other step (welcome, filters_risk, filters_status, kpi, highlight_row) → just call `guided.back()`.

2. **Suppress the auto-advance effects for one tick after a Back action** so they don't see the still-open panel and snap forward. Add a small ref `backInFlightRef = useRef(false)` set true at the start of the back handler and cleared on the next microtask (`queueMicrotask` or `requestAnimationFrame`). Both auto-advance effects (`useEffect` at lines ~316 and ~339) gain an early `if (backInFlightRef.current) return;` guard. This is the same pattern already used by `tourEndedRef`.

   Order in the back handler matters: set `backInFlightRef.current = true` → mutate the panel state → call `guided.back()` → schedule the reset. Because the effect runs after the synchronous state updates, the guard is in place when it evaluates.

## Things explicitly NOT changed

- `guided.back()` itself in `GuidedTourContext.tsx` — keep its single responsibility (rewind index).
- `onNext`, `onSkip`, auto-start, auto-advance triggers, success modal, hero buttons, settings toggle — untouched.
- Tour step list, copy, anchors, styling.
- The "End guided tour" / Skip flow (`endGuidedTour`) — untouched.

## Files touched

- `src/features/action-queue/components/ActionQueuePage.tsx` — add `backInFlightRef`, add early-return guards to the two auto-advance `useEffect`s, replace `onBack={guided.back}` with the new handler.

Approve to implement?
