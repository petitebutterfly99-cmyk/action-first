# Fix Guided Tour Steps 7 & 8

Targeted fixes to the guided tour. No redesign.

## Issues & Fixes

### 1. Step 7 ("Open send dialog") doesn't open the outreach modal
**Cause:** `onNext` for `detail_panel` calls `c.setOutreachAccount(guidedAccount)`, but `guidedAccount` is derived from `c.accounts.find(a => a.id === guided.focusAccountId)`. If the account is filtered out or the lookup is stale, this becomes `null` and nothing happens.

**Fix:** Prefer `c.selectedAccount` (the account currently open in the detail panel) as the source of truth, falling back to `guidedAccount`. This guarantees the modal opens for whatever the user is looking at.

### 2. Step 8 highlights the Send button instead of the message field
**Fix:**
- Add a `messageFieldRef` prop on `OutreachModal` and forward it to the `<Textarea>`.
- In `ActionQueuePage`, create `outreachMessageRef` and pass it to `OutreachModal`.
- In the `GuidedCoachmark` `anchors` map, change `outreach_modal` from `outreachSendRef` to `outreachMessageRef`.
- Tweak the `outreach_modal` body copy slightly so it makes sense pointing at the field ("Edit the message here, then click Send Message below.").

### 3. "Skip tour" button on step 8 should say "End guided tour" AND must actually exit the tour
**Cause of current bug:** Even though `onSkip` calls `guided.exit("user")`, the underlying `OutreachModal` Dialog (and any other surface the tour opened) stays open, so the user perceives the tour as still active. Same problem affects the header X icon.

**Fix — single shared "end tour" handler:**
- In `CoachmarkPopover`, rename the secondary button on the final step from "Skip tour" to "End guided tour". Both this button and the header X icon already call `onSkip` — keep that wiring so they share one exit path.
- In `ActionQueuePage`, replace the current minimal `onSkip` with a single `endGuidedTour` function passed as `onSkip`. It must:
  1. `guided.exit("user")` — clears tour state.
  2. `c.setOutreachAccount(null)` — closes the outreach dialog (this is what's blocking step 8 exit today).
  3. If `c.selectedAccount?.id === guided.focusAccountId`, call `c.setSelectedAccount(null)` to close the detail panel.
  4. `setPerformanceOpen(false)` — collapses the perf panel if the tour opened it.
  5. `setGuidedSuccessOpen(false)` — dismisses the success modal if shown.

This guarantees both "End guided tour" and the X icon fully tear down the tour and every surface it opened, on every step (not just step 8).

### 4. Verify the same handler works on earlier steps
The expanded `endGuidedTour` is safe on steps 1–7: each setter is a no-op when the corresponding surface isn't open. So we only need one handler for the whole tour.

## Files to Edit

- `src/features/guided-tour/CoachmarkPopover.tsx` — relabel "Skip tour" → "End guided tour".
- `src/features/guided-tour/GuidedCoachmark.tsx` — minor copy tweak for `outreach_modal` step.
- `src/features/outreach/components/OutreachModal.tsx` — add optional `messageFieldRef` prop, forward to `<Textarea>`.
- `src/features/action-queue/components/ActionQueuePage.tsx`:
  - Add `outreachMessageRef`, pass to `OutreachModal`.
  - Swap anchor for `outreach_modal` step to `outreachMessageRef`.
  - Make step 7 `onNext` use `c.selectedAccount ?? guidedAccount`.
  - Replace `onSkip` with a single `endGuidedTour` that exits the tour AND closes the outreach modal, detail panel (if it's the guided one), performance panel, and success modal.

## Out of Scope
No new steps, no analytics changes, no visual redesign of the coachmark.
