## Plan: Stabilize Guided Tour Steps 6–8

I’ll make a targeted fix to the guided tour flow so each step highlights the intended surface and advances/exits on the first click.

### 1. Guide 6: highlight the correct high-risk record and make the link focusable
- Change Guide 6’s target selection from a stale/raw account lookup to the first visible high-risk account in the current sorted list, matching what the user actually sees.
- When the tour reaches Guide 6, automatically widen filters if needed, reveal the row in the virtual/infinite list, and scroll it into view so the coachmark can anchor to it.
- Add a dedicated ref for the account-name/open-detail button inside the row, so the guide highlights the link that opens the detail modal instead of the whole row container.
- Keep the existing row pulse/highlight as a secondary visual cue.

### 2. Guide 7: focus the whole detail modal, not the “Send Outreach” button
- Add a ref to the detail panel/sheet container and anchor Guide 7 to that container.
- Stop using the `Send Outreach` button ref as the Guide 7 anchor.
- Update the Guide 7 copy to make it clear that the user is reviewing the detail modal before opening the send dialog.

### 3. Guide 7 double-open bug: make “Open send dialog” advance immediately
- Update the “Open send dialog” handler so that, on the first click, it both opens the outreach modal and explicitly advances tour state to Guide 8.
- Tighten the existing auto-advance effect so it doesn’t re-route back to Guide 7 while the outreach modal is being opened.
- This should remove the current behavior where Guide 7 appears a second time and only opens the outreach modal on the second click.

### 4. Guide 8: make “End guided tour” exit on the first click
- Replace the inline skip handler with one stable shared `endGuidedTour` callback.
- Use that same handler for the X button, backdrop dismiss, Escape, and the final “End guided tour” button.
- Close all tour-opened surfaces in that handler: outreach dialog, detail panel, performance panel, success modal, and any pending outcome modal.
- Add a small guard so Guide 8 cannot re-render from stale `outreachAccount` state after the tour has been ended.

### 5. Clean up related ref warnings
- The browser console shows a React warning caused by a ref being passed through `DialogFooter`, which is a function component.
- I’ll remove the now-unused outreach send-button ref wiring, since Guide 8 should anchor to the message field only.

### Files to update
- `src/features/action-queue/components/ActionQueuePage.tsx`
- `src/features/action-queue/components/ActionQueueRow.tsx`
- `src/features/account-detail/components/AccountDetailPanel.tsx`
- `src/features/guided-tour/GuidedCoachmark.tsx`
- `src/features/outreach/components/OutreachModal.tsx`

### Expected result
- Guide 6 highlights the first high-risk record’s open-detail link and can open the detail modal from there.
- Guide 7 highlights the whole detail modal and opens the send dialog on the first “Open send dialog” click.
- Guide 8’s “End guided tour” exits immediately on the first click and does not show Guide 8 again.