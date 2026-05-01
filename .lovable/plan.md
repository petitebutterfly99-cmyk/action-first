I reproduced the issue: when Step 7’s “Open send dialog” coachmark is clicked, the click occurs outside the account detail sheet from Radix’s perspective. The sheet closes first, which unmounts the anchor and leaves the tour on Step 7, so it appears to show Step 7 again instead of progressing to Step 8. The same outside-interaction timing can also cause Step 8’s “End guided tour” to require a second click.

Plan:

1. Add a tour-transition guard in `ActionQueuePage.tsx`
   - Track when the tour is intentionally transitioning from Step 7 to Step 8.
   - Use this guard to ignore the detail sheet’s close callback during the “Open send dialog” transition.
   - Move the tour to `outreach_modal` before opening the outreach modal, then close the detail panel, so the UI cannot render Step 7 again during the intermediate state.

2. Make guided modal close handlers tour-aware
   - Replace direct `onClose={() => c.setSelectedAccount(null)}` and `onClose={() => c.setOutreachAccount(null)}` handlers with stable handlers that:
     - do not close the detail panel while Step 7 is transitioning to Step 8,
     - do not close/re-open the outreach modal during Step 8’s explicit exit,
     - keep normal non-tour behavior unchanged.

3. Prevent outside-click dismissal from stealing coachmark clicks
   - In `AccountDetailPanel`, add optional props to prevent Radix outside interactions while the guided tour is controlling Step 7.
   - In `OutreachModal`, add optional props to prevent Radix outside interactions while Step 8 is active.
   - Pass these props only during the relevant guided steps, so regular users can still dismiss panels/modals normally outside the tour.

4. Harden the Step 7 and Step 8 actions
   - Step 7 “Open send dialog” will perform one deterministic transition:
     - set tour step to `outreach_modal`,
     - open outreach modal for the same guided account,
     - close detail panel without allowing auto-advance effects to snap back.
   - Step 8 “End guided tour” will perform one deterministic exit:
     - mark the tour as ended,
     - close outreach modal/detail panel/outcome modal,
     - exit guided mode once, without rendering Step 8 again.

5. Verify in browser after implementation
   - Run through Step 6 → Step 7 → Step 8.
   - Confirm “Open send dialog” opens the outreach modal on the first click and displays Step 8.
   - Confirm Step 7 does not reappear.
   - Confirm Step 8 “End guided tour” exits on the first click and does not reappear.