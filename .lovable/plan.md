## Goal

Extend the guided tour beyond the current 3 steps (highlight row → open detail → send outreach) so new users also learn:

- How to use the **Risk** and **Queue Status** filters
- What the **KPI row** is for
- How to open the **CSM Performance** panel for self-check metrics

At the same time, replace the inline `GuidedCallout` banners with **floating coachmark popovers** that anchor directly to the UI elements the user needs to click (per the previously approved direction). Keep the existing Gainsight-style UI; do not add new dashboards or pages.

---

## New tour shape (8 steps)

```text
1. welcome           → popover anchored to ActionQueueHero "Start with highest-risk" button
2. filters_risk      → popover anchored to the Risk Level toggle group
3. filters_status    → popover anchored to the Queue Status select
4. kpi               → popover anchored to the KpiRow strip
5. performance       → popover anchored to the CSM Performance collapsible trigger
                       (auto-opens it so the user sees what's inside)
6. highlight_row     → popover anchored to the top high-risk row (existing step)
7. detail_panel      → popover anchored to the "Send Outreach" button in the detail side panel
8. outreach_modal    → popover anchored to "Send Message" in the outreach modal
                       → on send, show success modal with "Next account" / "Exit"
```

Each popover shows: step `N of 8`, title, 1–2 line body, **Next** / **Back** / **Skip tour** controls, and a small `×` close. Skip / Esc fires `guided_flow_exited` with `last_step`.

The `welcome` step can also be reached from the hero "Guide me" button at any time. Auto-start (first visit) jumps straight to step 1.

---

## Architecture

### New files

- `src/features/guided-tour/CoachmarkPopover.tsx`
  - Wraps Radix `Popover` + `PopoverAnchor`. Props: `open`, `anchorRef`, `side`, `align`, `title`, `body`, `stepNumber`, `totalSteps`, `onNext`, `onBack`, `onSkip`, `nextLabel`, `nextDisabled`.
  - Renders inside a portal with `z-[60]` so it sits above the side panel and modals.
  - Uses `PopoverAnchor` with a virtual element bound to `anchorRef.current` so the target stays fully interactive.

- `src/features/guided-tour/CoachmarkBackdrop.tsx`
  - Dim layer (`bg-black/30`) with a CSS cutout rectangle around the anchor's bounding rect using `box-shadow: 0 0 0 9999px hsl(var(--background)/0.55)` on a positioned div sized to the target + 6px padding + rounded corners. Recomputes on `resize`, `scroll`, and `ResizeObserver` of the anchor.
  - Pointer-events: none on the cutout, auto on the dim — clicking the dim calls `onSkip`.
  - Skipped (returns null) when no anchor is mounted (e.g. step targets a modal that hasn't opened yet).

### Updated files

- `src/features/guided-tour/GuidedTourContext.tsx`
  - Replace `GuidedStep` union with the 8 steps above (`"welcome" | "filters_risk" | "filters_status" | "kpi" | "performance" | "highlight_row" | "detail_panel" | "outreach_modal" | "success" | null`).
  - Add `next()`, `back()` helpers + `totalSteps` constant. Keep existing `start`, `goTo`, `exit`. Track step transitions with existing `guided_flow_started` / `guided_flow_exited` events; no new event types required.

- `src/features/action-queue/components/ActionQueuePage.tsx`
  - Add refs: `heroCtaRef`, `riskFilterRef`, `statusFilterRef`, `kpiRowRef`, `performancePanelRef`. Pass them via new optional `anchorRef` props on the relevant components (or wrap inline with a `<div ref=...>`).
  - Render a single `<CoachmarkPopover>` whose props are derived from `guided.step`. The existing per-row highlight ring stays for the `highlight_row` step.
  - Auto-open the CSM Performance collapsible when entering `performance` step (lift its `open` state into the page via a controlled `<Collapsible open={...}>`).
  - Existing effects that advance the tour when the detail panel / outreach modal opens are kept, just retargeted to the new step names.

- `src/features/action-queue/components/ActionQueueHero.tsx`
  - Forward a `ctaRef` prop onto the "Start with highest-risk" button so the welcome coachmark can anchor to it.

- `src/features/account-detail/components/AccountDetailPanel.tsx`
  - Accept optional `sendButtonRef` and forward to the "Send Outreach" button. Drop the `guidedCallout` slot added previously.

- `src/features/outreach/components/OutreachModal.tsx`
  - Accept optional `sendButtonRef` and forward to the "Send Message" button.

- `src/features/analytics/components/CsmPerformancePanel.tsx`
  - Accept optional `open` + `onOpenChange` to allow the page to control it during the tour. When uncontrolled, behaves as today.

### Files removed

- `src/features/guided-tour/GuidedCallout.tsx` — replaced by `CoachmarkPopover`.
- Re-export removed from `src/features/guided-tour/index.ts`; add `CoachmarkPopover` export instead.

---

## Step content (draft copy)

| Step | Title | Body |
|---|---|---|
| welcome | This is your CSM Action Queue | We'll walk through filters, metrics, and your first outreach. ~30 seconds. |
| filters_risk | Focus on the riskiest accounts | Toggle Risk Level to narrow the queue. High-risk accounts ghost soonest. |
| filters_status | Filter by where you left off | Use Queue Status to revisit Contacted, Snoozed, or Follow-up needed. |
| kpi | Today at a glance | Coverage of high-risk accounts and outreach attempts update as you act. |
| performance | Self-check your week | Open CSM Performance for action mix, AI usage, and retry rate. |
| highlight_row | Your top high-risk account | Open it to see signup activity and a recommended outreach. |
| detail_panel | Send the outreach | Review the AI-generated message, then click Send Outreach. |
| outreach_modal | Personalize and send | Edit if needed, then Send Message. We'll log it for you. |

Success modal copy is unchanged.

---

## Behavior rules

- **Skippable any time**: backdrop click, Esc, `×`, or "Skip tour" all call `guided.exit("user")` and persist `retainiq:guided-seen=1`.
- **Resilient to missing anchors**: if a target ref is null (e.g. queue empty so no row to highlight), the popover renders centered with no backdrop cutout and a "Continue" button.
- **No workflow blocking**: tracking calls remain fire-and-forget; popover errors are caught and silently exit the tour.
- **Auto-start gating**: only on first visit (existing localStorage flag), only when there's at least 1 actionable account, only after auth + initial load resolve.
- **Re-entry**: "Guide me" button on the hero restarts at step 1 regardless of localStorage.

---

## Out of scope

- No new event types, no schema changes, no new pages.
- No redesign of filters, KPI row, or performance panel — only ref forwarding and one controlled-open prop.
- No tour for the Activity Log, Accounts, or Settings pages.

---

## Files touched

**New**: `CoachmarkPopover.tsx`, `CoachmarkBackdrop.tsx`
**Edited**: `GuidedTourContext.tsx`, `index.ts` (guided-tour), `ActionQueuePage.tsx`, `ActionQueueHero.tsx`, `AccountDetailPanel.tsx`, `OutreachModal.tsx`, `CsmPerformancePanel.tsx`
**Deleted**: `GuidedCallout.tsx`

Approve to implement.