# Floating Coachmark Tour

Replace the current inline guided callouts with **floating popovers anchored to the exact element the user needs to click**, with an optional dimmed backdrop that highlights the target. Built on Radix Popover (already in the project) so positioning, arrows, viewport flipping, and a11y are handled.

## What the user will see

- **Step 1** — popover floats next to the highest-risk row, arrow pointing at the row's primary action button. Background is dimmed; the row stays bright and clickable.
- **Step 2** — popover floats next to the "Send Outreach" button inside the open account detail panel.
- **Step 3** — popover floats next to the "Send Message" button inside the outreach modal (no backdrop here so the modal stays usable).
- **Step 4** — success modal (unchanged).

Every popover keeps the existing affordances: step counter ("Step 1 of 3"), title, body, primary CTA, and an always-visible "Exit guided mode" link so users are never trapped.

## Implementation

### 1. New `CoachmarkPopover` component

A thin wrapper around Radix Popover with our coachmark styling and an arrow.

- Props: `open`, `targetRef` (or `anchor` element), `side`, `title`, `body`, `ctaLabel`, `onCta`, `onExit`, `stepNumber`, `totalSteps`.
- Renders into a portal so it floats above everything (including the side sheet).
- Uses `PopoverAnchor` so the trigger element stays where it is and the popover positions relative to it. This lets us anchor to a row that the user can still interact with normally.
- Arrow points at the anchor; flips automatically when near the viewport edge.

### 2. New `CoachmarkBackdrop` component

A fixed full-screen overlay (`bg-black/40`) with a CSS cutout around the target's bounding box (computed from `getBoundingClientRect` + `ResizeObserver` + scroll listener). The cutout is achieved with a `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)` trick on a positioned div sized to the target — no SVG masking needed.

- Pointer-events: none on the backdrop itself, so the highlighted target stays clickable.
- Skipped for step 3 (inside the modal — would conflict with Radix Dialog's own overlay).

### 3. Refs to anchor against

- `ActionQueueRow` already accepts a `ref`. The page already stores per-row refs in `c.cardRefs`. Use that directly for step 1.
- `AccountDetailPanel` — add an internal `ref` on the "Send Outreach" footer button, exposed via a new `sendButtonRef` prop (forwarded ref pattern) so the page can anchor to it for step 2.
- `OutreachModal` — add a `sendButtonRef` prop the same way for step 3.

### 4. Wire into `ActionQueuePage`

Replace the three `<GuidedCallout>` insertions with `<CoachmarkPopover>` instances driven by `guided.step`:

```text
guided.step === "highlight"  → anchor: cardRefs.current[focusAccountId]
guided.step === "detail"     → anchor: detailSendButtonRef.current
guided.step === "outreach"   → anchor: outreachSendButtonRef.current
```

A single `<CoachmarkBackdrop targetRef={...} />` is rendered for steps 1 and 2 only.

### 5. Keep existing behavior

- All six analytics events stay wired identically.
- Auto-start on first login (`localStorage` flag) is unchanged.
- "Guide me" / "Exit guided mode" toggle in the hero is unchanged.
- Success modal (step 4) is unchanged — it's already a centered dialog, not anchored.
- The old `GuidedCallout` component will be deleted once nothing references it.

## Files touched

- **New**: `src/features/guided-tour/CoachmarkPopover.tsx`, `src/features/guided-tour/CoachmarkBackdrop.tsx`
- **Edit**: `src/features/guided-tour/index.ts` (export new pieces, remove `GuidedCallout`)
- **Edit**: `src/features/action-queue/components/ActionQueuePage.tsx` (swap callouts → popovers, manage anchor refs)
- **Edit**: `src/features/account-detail/components/AccountDetailPanel.tsx` (expose `sendButtonRef`, drop the `guidedCallout` slot)
- **Edit**: `src/features/outreach/components/OutreachModal.tsx` (expose `sendButtonRef`)
- **Delete**: `src/features/guided-tour/GuidedCallout.tsx`

## Edge cases handled

- **Target scrolled out of view**: backdrop and popover follow on `scroll` / `resize`; if the target unmounts (e.g. user filters it away), the tour auto-exits with reason `"target_lost"`.
- **Viewport too small for popover on the requested side**: Radix flips it automatically.
- **Inside the outreach Dialog**: Radix Popover renders into a portal with a higher z-index than the Dialog content, so it stays visible above the modal.
- **Keyboard users**: popover is focusable; Esc exits the tour (matches the X / "Exit guided mode" behavior).

Approve to switch the tour over to floating coachmarks.
