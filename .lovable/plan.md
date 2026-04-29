# Fix guided tour issues

Two bugs in the floating coachmark tour added in the last pass:

## Issue 1 — Step 2 looks like it shows twice

Step 2 anchors to the "Send Outreach" button inside `AccountDetailPanel`, which is a Radix `Sheet`. Sheets render their own dark overlay at `z-50`. We are also rendering `CoachmarkBackdrop` (a separate dim layer with a cutout) at `z-40` over the same button. The result is two stacked dimming layers behind the same popover, which reads as a duplicate / repeated step.

Step 1 doesn't have this problem because the Action Queue row isn't inside a Sheet.

**Fix:** Skip `CoachmarkBackdrop` for step 2. The Sheet's own overlay already isolates the user's attention, and the popover with arrow plus the bright primary `Send Outreach` button is enough visual focus. Keep the backdrop only for step 1 (queue row, no overlay) and let step 2 / 3 rely on the Sheet/Dialog overlay that's already there.

## Issue 2 — "Got it" button on step 3 does nothing

Step 3 is the popover on top of the `OutreachModal` pointing at "Send Message". Its `onCta` is currently a no-op comment ("user clicks the actual Send Message button"). So clicking "Got it" feels broken.

**Fix:** Change step-3 CTA behavior to actually dismiss the coachmark. Two clean options:

- Relabel to **"Got it"** and make it close the coachmark only (hide the popover, keep the modal open so the user can still send). Implement by adding a local `step3Dismissed` flag in `ActionQueuePage` that gates the popover's `open` prop. Reset the flag whenever step changes away from `outreach` so re-entering the tour works.

This matches what users already expect from a "Got it" button.

## Technical changes

Files touched:

- `src/features/action-queue/components/ActionQueuePage.tsx`
  - Remove the `<CoachmarkBackdrop … detailSendButtonRef … />` block (step 2).
  - Add `const [step3Dismissed, setStep3Dismissed] = useState(false)`.
  - Reset it in an effect when `guided.step !== "outreach"`.
  - Step-3 `CoachmarkPopover`: set `open={guided.active && guided.step === "outreach" && !step3Dismissed}` and `onCta={() => setStep3Dismissed(true)}`.

No changes needed to `CoachmarkPopover`, `CoachmarkBackdrop`, `GuidedTourContext`, or `AccountDetailPanel`.

## Out of scope

- No redesign of the tour copy or step order.
- No changes to analytics events.
- No change to the auto-start logic or `localStorage` flag.
