# RetainIQ — Product Requirements Document
*Milestone 3 prototype · CSM churn-prevention workflow tool*

---

## 1. Overview

**RetainIQ** is a focused Customer Success workflow tool that replaces passive analytics dashboards with a **prioritized, action-oriented queue** of accounts at churn risk. It is explicitly *not* a dashboard — every screen pushes a CSM toward an immediate, measurable intervention.

The prototype is the experiment: its UI, constraints, and instrumentation are designed to test one specific hypothesis about early team activation as a churn signal.

---

## 2. Target User

**Primary persona: Customer Success Manager (CSM) at a B2B SaaS company.**

- Manages a portfolio of 30–100+ post-signup accounts.
- Logs in each morning asking: *“What should I do today to prevent churn?”*
- Currently relies on health-score dashboards, reports, and gut feel — none of which tell them *what action to take next*.
- Time-poor; needs to triage and act inside a short morning window.

Secondary stakeholders: CS leaders (who want measurable intervention rates) and Product/Growth (who want activation-driven retention signal).

---

## 3. Problem

In current CS tooling, the signal that an account is failing to activate is **buried**:

- Health scores aggregate too many inputs, hiding root cause.
- Dashboards show *state*, not *next action*.
- Activation gaps (e.g., no teammate invited in week 1) are visible only if a CSM thinks to query for them.
- The result: CSMs intervene too late, inconsistently, or not at all.

**The unmet need:** a CSM-facing surface that (a) detects early activation failure, (b) prioritizes it, and (c) makes the right intervention a single click — with enough inline evidence to build conviction.

---

## 4. Hypothesis

> If CSMs are presented with a prioritized list of accounts that have not invited teammates within 3–5 days of signup, then at least **60% of them will take or clearly commit to a specific action**, because early team activation is a strong predictor of retention and this insight is not clearly surfaced today.

The product exists to test this hypothesis. Every interaction is designed to make the action-rate **measurable**.

---

## 5. What It Does

RetainIQ surfaces a **daily, sorted queue** of accounts at risk of churn — primarily because they have not activated their team — and pairs each row with:

- The **evidence** for why it’s at risk (days since signup, invites sent, active users, last activity, ARR).
- A **contextual insight** (e.g., *“Accounts like this churn at 78%”*) and a verbatim **user quote** from churn research.
- A **state-aware primary action** (Send Outreach, Log Outcome, Follow Up, Resume, Reopen) plus secondary actions (Prompt Invite, Snooze, Mark Reviewed).
- A lightweight **next-best-account** handoff after every successful action.

Processed accounts dim and demote rather than disappear, so progress through the queue stays visible.

---

## 6. Screens

### 6.1 Action Queue — `/` (primary screen)
The heart of the product.

**Purpose:** triage and act on at-risk accounts in priority order.

- Risk-driven hierarchy: High Risk rows have a red left border + bold red badge; Medium uses neutral surface + yellow badge; Healthy is de-emphasized.
- Status-aware prominence: processed rows (Contacted, Reviewed, Snoozed) dim slightly but stay visible.
- State-aware primary CTA per row:
  - `needs_action` → **Send Outreach**
  - `contacted` → **Log Outcome**
  - `follow_up_needed` → **Follow Up**
  - `reviewed` → **Reopen**
  - `snoozed` → **Resume** (with snooze-until pill)
- Filter bar: Risk Level (multi-select toggle group with counts) + Queue Status (select with counts) + active-filter chips + Clear filters control.
- Dense table layout: Account · Day · Invites · Users · Last activity · ARR · Risk · Status · Action.
- Default sort: actionable first → Risk (High → Healthy) → most days inactive first.
- Empty state when filters return zero rows: *“No accounts match this filter”* with Reset filters / View All actions.

### 6.2 Account Detail Panel
**Purpose:** give the CSM enough context to act with conviction without leaving the queue.

Side panel opened on row click. Shows activation timeline (signed up → first task → invites), key stats, retention insight, and a contextual user quote.

### 6.3 Outreach Modal
**Purpose:** make sending a personalized outreach message frictionless and never blocked by AI.

- Opens with a **default pre-filled template** instantly.
- AI suggestion runs in the background with a **2 s timeout**; replaces the template only if the user hasn’t typed.
- On AI failure/timeout: template stays, inline *“We couldn’t generate a suggestion right now. You can still edit this message.”* with **Try again**.
- **Send is always enabled** when the textarea has content. Send failures surface inline with **Retry** and **Copy message**.

### 6.4 Prompt Invite Modal
**Purpose:** give the CSM a low-friction, forwardable invite-link message for the customer.

### 6.5 Outcome Modal
**Purpose:** capture what happened after a Contacted account was followed up on (replied, no reply, meeting booked, etc.).

### 6.6 Snooze Modal
**Purpose:** defer an account with a contextual reason and resume date.

### 6.7 Next-Best-Account Modal
**Purpose:** keep the CSM in flow after each completed action.

Explicit states: loading → *“still finding…”* → *“done for now”* → *“couldn’t load next.”* No silent failures.

### 6.8 Accounts — `/accounts`
**Purpose:** full-portfolio view; entry point back into the Action Queue.

Includes a **View in Action Queue** action that handles distinct states: visible, hidden by filter, not currently in queue, and navigation failure.

### 6.9 Activity Log — `/activity`
**Purpose:** chronological record of CSM actions for visibility and audit.

### 6.10 Settings — `/settings`
**Purpose:** configure risk thresholds and notification preferences.

---

## 7. User Flow

1. CSM lands on **Action Queue** (default route).
2. Scans the prioritized list — high-risk, no-invite accounts surface first; processed rows are dimmed but in view.
3. Optionally narrows with Risk Level + Queue Status filters; active filters are shown as chips with one-click clear.
4. Reads the contextual insight + verbatim user quote on each row to build conviction.
5. Optionally clicks the row to open the **Account Detail Panel** for the activation timeline.
6. Takes the row’s state-aware primary action, or a secondary action (Prompt Invite, Snooze, Mark Reviewed, Log Outcome, Follow Up, Resume).
   - **Send Outreach** → edits the pre-filled message → sends → row updates to *Contacted* and demotes.
7. After a successful action, a lightweight **“Loading next account…”** transition surfaces the next-best account, or shows *“You’re done for now”* / *“Couldn’t load next.”*
8. If a row drops out of the active filter after a status change, a brief toast explains *“This account moved out of the current filter after its status was updated.”*
9. Every successful action attempts an Activity Log write; if it fails, the action is **not** rolled back — a non-blocking warning with **Retry log update** appears.

---

## 8. Key Metrics

### 8.1 Primary (hypothesis validation)
- **Action rate:** % of surfaced accounts on which the CSM takes or commits to a specific action within the session.
  - **Target: ≥ 60%.**
- **Time-to-first-action:** median seconds from queue load to first action committed.

### 8.2 Secondary (workflow health)
- **Coverage:** % of high-risk accounts touched per day.
- **Action mix:** distribution across Send Outreach / Prompt Invite / Snooze / Reviewed / Log Outcome.
- **Outreach send-success rate** and **retry rate**.
- **AI suggestion usage:** % of outreach sends where the AI-generated draft was kept vs. edited vs. discarded (template kept).
- **Filter usage:** frequency of combined Risk × Status filters and zero-result hits (signal for filter UX issues).
- **Next-best-account acceptance:** % of completed actions that lead into another action via the next-best handoff.

### 8.3 Downstream (retention impact, post-MVP)
- **Activation lift:** invite rate within 7 days for accounts that received outreach vs. control.
- **Retention lift:** week-4 retention for activated vs. non-activated cohorts.

---

## 9. Mocked vs. Real

### 9.1 Real (shipped in M3)
- Full client-side React 18 + Vite + TypeScript app with semantic HSL design tokens.
- All UI flows and state transitions: filters, sorting, status changes, dimming/demotion, empty states, filter-aware toasts.
- Outreach modal with instant pre-filled template and **non-blocking** background AI generation (2 s timeout, fallback copy, Try again).
- Decoupled Activity Log writes with non-blocking retry on failure.
- Next-best-account flow with explicit loading / done / error states.
- Accounts → Action Queue navigation with all edge cases (visible / hidden by filter / not in queue / navigation failure).
- Account Detail Panel with activation timeline.
- Routing, layout, sidebar, settings page.

### 9.2 Mocked
- **Account data**: ~42 accounts generated in `src/data/mockAccounts.ts`, biased so ~12% have invited a teammate — mirrors the real-world activation gap the tool is designed to surface.
- **User quotes**: hand-curated strings drawn from churn/retention research, attached to a subset of accounts.
- **Activity log entries**: in-memory store seeded with example actions (`src/data/activityStore.ts`).
- **AI message generation**: simulated locally — there is no real AI gateway call. The 2 s timeout and fallback paths are real and behave identically to a live integration.
- **Sending outreach**: no real email is sent; the action updates local state and (notionally) writes to the activity log.
- **Authentication / multi-user**: none — single implicit “You” user.
- **Persistence**: none — state is in-memory and resets on reload.

### 9.3 Not yet built (explicitly out of scope for M3)
- Real backend (database, auth, multi-tenant accounts).
- Real AI Gateway integration for outreach generation.
- Real email/Slack send for outreach and invite prompts.
- Analytics instrumentation pipeline (events are discrete and instrumentation-ready, but not wired).
- Saved filter presets, role-based permissions, team-wide queues.

---

## 10. Build Principles (as implemented)

- **No dashboards, no charts.** The product is a decision + action engine.
- **Prioritization over filtering.** Pre-sorted on load (actionable → risk → inactivity); filters refine, not configure.
- **Evidence inline.** Stats + insight + verbatim quote on every row.
- **Constrained action set.** Small, state-aware CTAs so the experiment measures intent cleanly.
- **Status-driven demotion, not deletion.** Progress stays visible.
- **AI is assistive, never required.** Default templates, 2 s timeout, never overwrite user input.
- **Action and log are decoupled.** A failed log write never blocks a real intervention.
- **Explicit edge states, not silent failures.** Every loading, empty, and failure path has its own UI.

---

## 11. Tech Stack

React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Router · TanStack Query

---

*End of PRD — Milestone 3 prototype.*
