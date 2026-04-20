# RetainIQ — M3 (End-of-M3 Summary)

A focused Customer Success workflow tool — Gainsight-inspired but explicitly **not** a dashboard — built to test a specific churn-prevention hypothesis. This document captures the state of the product at the end of Milestone 3.

---

## Hypothesis

> If CSMs are presented with a prioritized list of accounts that have not invited teammates within 3–5 days of signup, then at least **60% of them will take or clearly commit to a specific action**, because early team activation is a strong predictor of retention and this insight is not clearly surfaced today.

The product is the experiment. Every screen, interaction, and constraint is designed to make the action-rate measurable.

---

## Scenario

CSMs at a B2B SaaS company log in each morning asking one question: *"What should I do today to prevent churn?"*

Today, that signal is buried across dashboards, health scores, and reports. RetainIQ replaces passive analytics with a **prioritized action queue** — accounts at risk because they have not activated their team — and pairs each one with the context, evidence, and one-click actions a CSM needs to intervene immediately.

Mock data is tuned to mirror the real activation gap: ~42 accounts with only ~12% having invited a teammate, so the queue surfaces a realistic distribution of high/medium/healthy risk.

---

## Key Screens

### 1. Action Queue — `/` (primary)
The heart of the product.

- **Risk-driven hierarchy**: High Risk rows have a red left border + bold red badge; Medium uses neutral surfaces + yellow badge; Healthy is de-emphasized.
- **Status-aware prominence**: Processed rows (Contacted, Reviewed, Snoozed) dim slightly but stay visible — CSMs see their progress through the queue.
- **State-aware primary CTA** per row:
  - `needs_action` → **Send Outreach**
  - `contacted` → **Log Outcome**
  - `follow_up_needed` → **Follow Up**
  - `reviewed` → **Reopen**
  - `snoozed` → **Resume** (with snooze-until pill)
- **Filter bar**: Risk Level (multi-select toggle group with counts) + Queue Status (select with counts) + active-filter chips + **Clear filters** control.
- **Dense table-style layout**: Account · Day · Invites · Users · Last activity · ARR · Risk · Status · Action.
- **Default sort**: actionable rows first → Risk (High → Healthy) → most days inactive first.

### 2. Account Detail Panel
Side panel opened on row click. Activation timeline (signed up → first task → invites), key stats, retention insight, and contextual user quote.

### 3. Outreach Modal
- Opens immediately with a **default pre-filled template** — never blank, never blocked by AI.
- AI suggestion runs in the background with a **2 s timeout**; if it succeeds before the user types, it replaces the template; if it fails or times out, the template stays and an inline **"Try again"** appears.
- Send is always enabled when the textarea has content. Send failures surface inline with **Retry** and **Copy message** options.

### 4. Prompt Invite Modal
Suggests a low-friction invite-link message the CSM can forward to the customer.

### 5. Outcome / Snooze / Next-Best-Account modals
- **Outcome** logs the result of a contacted account (replied, no reply, etc.).
- **Snooze** defers an account with a contextual reason and resume date.
- **Next-Best-Account** offers a frictionless "what's next?" handoff after each successful action, with explicit loading / "still finding…" / "done for now" / "couldn't load next" states.

### 6. Secondary pages
- **Accounts** (`/accounts`) — full account table, with **View in Action Queue** that handles visible / hidden-by-filter / not-in-queue / navigation-failure states distinctly.
- **Activity Log** (`/activity`) — chronological record of CSM actions.
- **Settings** (`/settings`) — risk threshold configuration.

---

## User Flow

1. CSM lands on **Action Queue** (default route).
2. Scans the prioritized list — high-risk, no-invite accounts surface first; processed rows are visibly dimmed but still in view.
3. Reads the contextual insight + verbatim user quote on each card to build conviction.
4. Optionally clicks the row to open the **Account Detail Panel** for the activation timeline.
5. Takes the row's state-aware primary action (or a secondary action):
   - **Send Outreach** → edits the pre-filled message → sends → row updates to *Contacted* and demotes.
   - **Prompt Invite** → copies a suggested invite message to forward.
   - **Mark Reviewed / Snooze / Log Outcome / Follow Up / Resume** depending on current state.
6. After a successful action, a lightweight **"Loading next account…"** transition surfaces the next-best account, or shows the explicit *"You're done for now"* / *"Couldn't load next"* state.
7. Every successful action attempts an Activity Log write; if the log write fails the action is **not** rolled back — a non-blocking warning with **"Retry log update"** appears instead.
8. If a row drops out of the active filter after a status change, a brief toast explains *"This account moved out of the current filter after its status was updated."*

---

## Main Build Decisions

### Product / UX
- **No dashboards, no charts.** The product is a decision + action engine. Every pixel pushes toward an intervention, not a report.
- **Prioritization over filtering.** Accounts are pre-sorted (actionable → risk → inactivity) so the CSM never has to configure a view to start working.
- **Evidence inline.** Churn statistics and verbatim user quotes appear on every card to justify the recommended action — conviction is built where the decision is made.
- **Constrained action set.** A small, state-aware set of primary actions per row forces the experiment to measure intent clearly rather than diluting it across many CTAs.
- **Status-driven demotion, not deletion.** Contacted / Reviewed / Snoozed accounts dim and move down rather than disappear, so progress is visible and rows never feel "lost."
- **Visual hierarchy = priority vs. progress.** Risk Level drives prominence (color, border, badge weight). Queue Status is shown as a secondary, neutral pill so it never competes with risk.

### State & Workflow Resilience
- **AI is assistive, never required.** The Outreach modal opens with a default template instantly. Background AI generation has a 2 s timeout, never overwrites user edits, and Send is always enabled when text is present.
- **Action and log are decoupled.** Actions commit independently of Activity Log writes; failed log writes surface a non-blocking warning with retry — the user is never blocked from moving on.
- **Explicit edge states, not silent failures.** Next-account loading, "done for now," "couldn't load next," "moved out of filter," "not currently in queue," and navigation-failure all have distinct, lightweight UI rather than collapsing into a single ambiguous spinner.
- **Filter-aware updates.** When an action causes a row to fall out of the active filter, the user is told why — preventing it from feeling like a bug.

### Engineering
- **Semantic design tokens.** All colors are HSL tokens defined in `index.css` / `tailwind.config.ts` (`risk-high`, `badge-urgent-bg`, `badge-warning-bg`, `risk-low`, etc.) so risk semantics stay consistent across cards, badges, borders, and modals.
- **Composable cards over a monolithic table.** `AccountCard` owns the row layout; the queue page owns sorting/filtering/state-transition logic. Keeps row visuals and queue logic independently testable.
- **Mock data tuned to the hypothesis.** Generators bias toward the activation-gap distribution the tool is designed to surface.
- **Instrumentation-ready.** Action buttons, row clicks, modal sends, and state transitions are discrete events — straightforward to wire to analytics to measure the 60% action-rate target.

---

## Tech Stack

React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Router · TanStack Query

---

## Status at end of M3

- ✅ Action Queue with risk + status filters, active-filter chips, counts, clear control
- ✅ State-aware row CTAs and visual hierarchy (priority vs. progress)
- ✅ Outreach modal with instant template + non-blocking AI suggestion
- ✅ Prompt Invite, Outcome, Snooze, Next-Best-Account flows
- ✅ Activity Log with decoupled writes + retry on failure
- ✅ Accounts page → Action Queue navigation with all edge states handled
- ✅ Account Detail panel with activation timeline
- ⏭️ Future: real backend + AI gateway, persistence, analytics instrumentation, saved filter presets
