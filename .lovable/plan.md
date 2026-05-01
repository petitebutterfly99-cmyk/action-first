## Goal

Auto-hide the guided tour entry buttons ("Start with highest-risk account" and "Guide me") in the Action Queue hero once the CSM has used the feature, and add a Settings toggle to re-enable them on demand.

**Constraint**: Do not alter any guided tour internals — coachmark logic, step ordering, focus handling, success modal, exit logic, anchors, or the recent Step 6/7/8 fixes remain exactly as they are.

## Behavior

- **First-time CSMs**: hero shows both buttons exactly as today.
- **After completing the tour** (success modal reached) **or after explicitly ending it** ("End guided tour"): both buttons disappear from the hero on subsequent visits and immediately within the current session.
- **Settings page**: new toggle "Show guided tour buttons in Action Queue" — when flipped on, the buttons reappear immediately. Default for new users: `true`.

## Where the preference lives

Reuse the existing `user_settings` table. Add one boolean column:

- `show_guided_tour_buttons boolean NOT NULL DEFAULT true`

RLS policies on `user_settings` already cover per-user read/write. No new table, no new policies needed.

## Technical changes (additive only)

1. **Migration** — `ALTER TABLE public.user_settings ADD COLUMN show_guided_tour_buttons boolean NOT NULL DEFAULT true;`

2. **`src/features/settings/hooks/useUserSettings.ts`**
   - Add `show_guided_tour_buttons: boolean` to `UserSettings`, `DEFAULTS` (`true`), the `select(...)` columns, the load mapping, and the upsert payload.

3. **`src/features/action-queue/components/ActionQueuePage.tsx`** (additive — no changes to existing tour wiring)
   - Read `settings.show_guided_tour_buttons` via `useUserSettings`.
   - Pass it to `<ActionQueueHero showGuidedButtons={...} />`.
   - In two places, fire-and-forget `updateToggle("show_guided_tour_buttons", false)`:
     - When the success modal is dismissed (tour completed).
     - When the user clicks "End guided tour" / exits via the coachmark skip handler.
   - These calls are added **alongside** the existing `guided.exit(...)` calls — they do not replace or change any tour state transitions.

4. **`src/features/action-queue/components/ActionQueueHero.tsx`**
   - Accept `showGuidedButtons?: boolean` (default `true`).
   - When `false`, omit the "Start with highest-risk account" button, the "Guide me" button, and the "N high-risk accounts waiting" inline label. Headline + descriptive copy stay visible. No other prop or behavior changes.

5. **`src/features/settings/components/SettingsPage.tsx`**
   - Add a new card section "Onboarding" with a `Switch` bound to `show_guided_tour_buttons`:
     - Label: "Show guided tour buttons in Action Queue"
     - Helper: "Re-enable the 'Start with highest-risk account' and 'Guide me' buttons on the queue page."

## Files NOT touched

- `GuidedTourContext.tsx`, `GuidedCoachmark.tsx`, `CoachmarkPopover.tsx`, `CoachmarkBackdrop.tsx`, `GuidedSuccessModal.tsx`
- `AccountDetailPanel.tsx`, `OutreachModal.tsx`, `ActionQueueRow.tsx`
- Any tour step ordering, anchors, or auto-advance logic

## Edge cases

- Settings still loading on first paint → treat as `true` (default) so we don't flicker the buttons away for first-time users.
- If the auto-disable upsert fails (offline), the local `useUserSettings` hook already rolls back; the buttons reappear and the user can dismiss again later. No tour behavior is affected.

Approve to implement?