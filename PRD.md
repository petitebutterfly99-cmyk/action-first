# RetainIQ — Product Requirements Document
*CSM churn-prevention workflow tool · current prototype state*

---

## 1. Overview

**RetainIQ** is a focused Customer Success workflow tool that replaces passive analytics dashboards with a **prioritized, action-oriented queue** of accounts at churn risk, scoped per Customer Success Manager (CSM). It is explicitly *not* a dashboard — every screen pushes a CSM toward an immediate, measurable intervention on accounts they own.

The prototype is the experiment: its UI, constraints, data model, and instrumentation are designed to test one specific hypothesis about early team activation as a churn signal.

---

## 2. Target User

**Primary persona: Customer Success Manager (CSM) at a B2B SaaS company.**

- Manages a portfolio of 60–120+ post-signup accounts (the seed data reflects this scale).
- Logs in each morning asking: *"What should I do today to prevent churn?"*
- Currently relies on health-score dashboards, reports, and gut feel — none of which tell them *what action to take next*.
- Time-poor; needs to triage and act inside a short morning window.
- Should only ever see and act on **their own assigned accounts**.

Secondary stakeholders: CS leaders (who want measurable intervention rates and per-CSM portfolio health) and Product/Growth (who want activation-driven retention signal).

---

## 3. Problem

In current CS tooling, the signal that an account is failing to activate is **buried**:

- Health scores aggregate too many inputs, hiding root cause.
- Dashboards show *state*, not *next action*.
- Activation gaps (e.g., no teammate invited in week 1) are visible only if a CSM thinks to query for them.
- Account ownership and per-CSM scoping is rarely enforced — CSMs see noise from accounts that aren't theirs.
- Aggregate counters like "contacted today" are easy to game or double-count, eroding trust in the metric.
- The result: CSMs intervene too late, inconsistently, or not at all.

**The unmet need:** a CSM-facing surface that (a) detects early activation failure, (b) prioritizes it within the CSM's own portfolio, (c) makes the right intervention a single click with enough inline evidence to build conviction, and (d) keeps row-level state and aggregate metrics provably consistent.

---

## 4. Hypothesis

> If CSMs are presented with a prioritized list of *their assigned* accounts that have not invited teammates within 3–5 days of signup, then at least **60% of them will take or clearly commit to a specific action**, because early team activation is a strong predictor of retention and this insight is not clearly surfaced today.

The product exists to test this hypothesis. Every interaction is designed to make the action-rate **measurable** per CSM.

---

## 5. What It Does

RetainIQ authenticates each CSM and surfaces a **daily, sorted queue** of *their* accounts at risk of churn — primarily because they have not activated their team — and pairs each row with:

- The **evidence** for why it's at risk (days since signup, invites sent, active users, last activity, ARR).
- A **contextual insight** (e.g. *"Accounts like this churn at 78%"*) and a verbatim **user quote** from churn research.
- A **state-aware primary action** (Send Outreach, Log Outcome, Follow Up, Resume, Reopen) plus secondary actions (Prompt Invite, Snooze, Mark Reviewed).
- A lightweight **next-best-account** handoff after every successful action.

Processed accounts dim and demote rather than disappear, so progress through the queue stays visible. The list scales to hundreds of accounts via incremental rendering.

---

## 6. Screens

### 6.1 Login — `/login`
**Purpose:** authenticate a CSM via Supabase Auth (email + password).

Demo CSMs (shared password `demo1234`): `sarah.chen@demo.app`, `marcus.rivera@demo.app`, `priya.patel@demo.app`, `daniel.kim@demo.app`. Unauthenticated users hitting any other route are redirected here.

### 6.2 Signup — `/signup`
**Purpose:** allow new CSMs to self-register. New users default to role `csm` with zero assigned accounts until an admin assigns them.

### 6.3 Forgot Password / Reset Password — `/forgot-password`, `/reset-password`
**Purpose:** standard email-based password recovery via Supabase Auth.

### 6.4 Action Queue — `/` (primary screen, post-login landing)
The heart of the product.

**Purpose:** triage and act on the logged-in CSM's at-risk accounts in priority order.

- **Account scope:** RLS enforces `assigned_csm_id = auth.uid()`; the CSM only ever sees their own accounts.
- Risk-driven hierarchy: High Risk rows have a red left border + bold red badge; Medium uses neutral surface + yellow badge; Healthy is de-emphasized.
- Status-aware prominence: processed rows (Contacted, Reviewed, Snoozed) dim slightly but stay visible.
- State-aware primary CTA per row:
  - `needs_action` → **Send Outreach**
  - `contacted` → **Log Outcome**
  - `follow_up_needed` → **Follow Up**
  - `reviewed` → **Reopen**
  - `snoozed` → **Resume** (with snooze-until pill)
- Per-row "Contacted today" badge driven by `last_outreach_sent_at` (timestamp source of truth).
- Filter bar: Risk Level (multi-select toggle group with counts) + Queue Status (select with counts) + active-filter chips + Clear filters control.
- Summary bar above the list: accounts needing action · high risk count · **Contacted Today** (aggregate of unique accounts whose `last_outreach_sent_at` is today) · snoozed count.
- Bulk-select bar (appears on selection): Send Outreach, Mark Reviewed, Assign Follow-up, Clear.
- **Infinite scroll:** first 50 rows render; an IntersectionObserver sentinel near the bottom appends 50 more at a time. Resets when filters change. Deep-link focus (`?focus=<id>`) expands the window so the targeted row is rendered before scrolling.
- Empty states:
  - **No assigned accounts:** *"You don't have any accounts assigned yet."* + Contact admin.
  - **Filter returns zero rows:** *"No accounts match this filter"* with Reset filters / View All.
  - **All in view handled:** *"You've handled everything in this queue"* + reset handled items.
  - **Load error:** *"Couldn't load accounts"* + Retry.
  - **Transport-classified errors:** offline / timeout / server failures get specific copy (e.g. *"Service Temporarily Unavailable"*) so the CSM can distinguish a connectivity blip from a back-end outage.
- Default sort: actionable first → Risk (High → Healthy) → most days inactive first.

### 6.5 Account Detail Panel
**Purpose:** give the CSM enough context to act with conviction without leaving the queue.

Side panel opened on row click. Shows activation timeline (signed up → first task → invites), key stats, retention insight, and a contextual user quote.

### 6.6 Outreach Modal
**Purpose:** make sending a personalized outreach message frictionless and never blocked by AI.

- Opens with a **default pre-filled template** instantly.
- AI suggestion runs in the background with a **2 s timeout**; replaces the template only if the user hasn't typed.
- On AI failure/timeout: template stays, inline *"We couldn't generate a suggestion right now. You can still edit this message."* with **Try again**.
- **Send is always enabled** when the textarea has content. Send failures surface inline with **Retry** and **Copy message**.
- On successful send, the row updates atomically: `status → contacted`, `last_outreach_sent_at → now`, `last_outreach_sent_by → CSM label`, `outreach_count += 1`. The Activity Log entry is written via `safeLog` so a log failure never reverts the action.

### 6.7 Outcome Modal
**Purpose:** capture what happened after a Contacted account was followed up on (replied, no reply, follow-up needed, meeting booked, etc.) and route the row to the right next status.

### 6.8 Prompt Invite Modal
**Purpose:** give the CSM a low-friction, forwardable invite-link message for the customer.

### 6.9 Snooze Modal
**Purpose:** defer an account with a contextual reason and resume date.

### 6.10 Next-Best-Account Modal
**Purpose:** keep the CSM in flow after each completed action.

Explicit states: loading → *"still finding…"* → *"done for now"* → *"couldn't load next."* No silent failures.

### 6.11 Accounts — `/accounts`
**Purpose:** full-portfolio view of the CSM's assigned accounts; entry point back into the Action Queue.

- Same RLS scoping as the Action Queue.
- Infinite scroll (50-row batches) for portfolios with hundreds of accounts.
- **View in Action Queue** action handles distinct states: visible, hidden by current filter, not currently in queue, and navigation failure.

### 6.12 Activity Log — `/activity`
**Purpose:** chronological record of CSM actions for visibility and audit.

Persisted in the Supabase `activity_log` table; RLS scopes visible entries to actions on the CSM's assigned accounts (or untargeted entries the CSM created).

### 6.13 Settings — `/settings`
**Purpose:** configure risk thresholds and notification preferences. User preferences persist via `useUserSettings`; risk thresholds are stored but not yet consumed by risk recomputation (see HANDOFF → Known gaps).

### 6.14 Analytics Panel
**Purpose:** give the CSM (and CS leaders) a lightweight read on action funnel + per-CSM performance without leaving the queue.

A KPI row plus CSM performance panel (`features/analytics/`) render inline above the Action Queue, derived from the same RLS-scoped `accounts` and `activity_log` data so per-CSM scoping is preserved.

---

## 7. User Flow

1. CSM opens the app, is redirected to `/login`, and signs in (or signs up).
2. App lands on **Action Queue** (`/`) with only their **assigned accounts** loaded.
3. CSM scans the prioritized list — high-risk, no-invite accounts surface first; processed rows dim but stay in view; rows beyond the first 50 stream in as the user scrolls.
4. Optionally narrows with Risk Level + Queue Status filters; active filters appear as chips with one-click clear.
5. Reads the contextual insight + verbatim user quote on each row to build conviction.
6. Optionally clicks the row to open the **Account Detail Panel** for the activation timeline.
7. Takes the row's state-aware primary action, or a secondary action (Prompt Invite, Snooze, Mark Reviewed, Log Outcome, Follow Up, Resume).
   - **Send Outreach** → edits the pre-filled message → sends → row atomically updates to *Contacted*, `last_outreach_sent_at = now()`, `outreach_count += 1`. The **Contacted Today** aggregate increments without refresh and without double-counting if the same account is contacted again today.
8. After a successful action, a lightweight **"Loading next account…"** transition surfaces the next-best account in the CSM's portfolio, or shows *"You're done for now"* / *"Couldn't load next."*
9. If a row drops out of the active filter after a status change, a brief toast explains *"This account moved out of the current filter after its status was updated."*
10. Every successful action attempts an Activity Log write; if it fails, the action is **not** rolled back — a non-blocking warning with **Retry log update** appears.
11. CSM can switch screens via the sidebar (Action Queue / Accounts / Activity Log / Settings) — every screen respects the same per-CSM scoping.
12. **Logout** returns the user to `/login`. Sign-out works while offline (local-scope token clear) so the CSM is never trapped in the app by a connectivity failure.

**Resilience overlay (applies to every step):** a global offline banner appears when connectivity is lost; account-level fetch failures classify into offline / timeout / server states with specific copy and Retry; a session-expiry toast surfaces silent token-refresh failures so the redirect to `/login` is never unexplained.

---

## 8. Key Metrics

### 8.1 Primary (hypothesis validation)
- **Action rate:** % of surfaced accounts on which the CSM takes or commits to a specific action within the session.
  - **Target: ≥ 60%.**
- **Time-to-first-action:** median seconds from queue load to first action committed.

### 8.2 Secondary (workflow health)
- **Coverage:** % of high-risk accounts touched per day, per CSM.
- **Action mix:** distribution across Send Outreach / Prompt Invite / Snooze / Reviewed / Log Outcome.
- **Contacted Today (aggregate):** unique accounts per CSM whose `last_outreach_sent_at` falls on the current local day. Drives the summary metric and is provably consistent with the per-row "Contacted today" badge.
- **Outreach send-success rate** and **retry rate**.
- **AI suggestion usage:** % of outreach sends where the AI-generated draft was kept vs. edited vs. discarded (template kept).
- **Filter usage:** frequency of combined Risk × Status filters and zero-result hits (signal for filter UX issues).
- **Next-best-account acceptance:** % of completed actions that lead into another action via the next-best handoff.
- **Activity log write-failure rate:** how often the post-action log write surfaces the retry warning.

### 8.3 Downstream (retention impact, post-MVP)
- **Activation lift:** invite rate within 7 days for accounts that received outreach vs. control.
- **Retention lift:** week-4 retention for activated vs. non-activated cohorts.

---

## 9. Mocked vs. Real

### 9.1 Real
- **Authentication:** Supabase Auth (email + password), real session handling, protected routes, logout, signup, forgot/reset password.
- **Database & access control:** Supabase Postgres with three tables — `profiles`, `accounts`, `activity_log`. Row-level security policies enforce per-CSM scoping (`assigned_csm_id = auth.uid()`) at the database, not in the client.
- **User profiles:** auto-created on signup via a Postgres trigger; default role `csm`.
- **Account ownership model:** every account row carries an `assigned_csm_id` foreign key into `profiles`.
- **Outreach state model:** `last_outreach_sent_at` (timestamptz), `last_outreach_sent_by`, and `outreach_count` are the row-level source of truth for both the per-row "Contacted today" badge and the aggregate Contacted Today metric. Atomic update on a successful send.
- **Activity log persistence:** writes go to the `activity_log` table; reads are RLS-scoped.
- **All UI flows and state transitions:** filters, sorting, status changes, dimming/demotion, empty states, filter-aware toasts.
- **Outreach modal:** instant pre-filled template + non-blocking background AI generation (2 s timeout, fallback copy, Try again).
- **Decoupled Activity Log writes** with a non-blocking retry on failure (`safeLog` helper).
- **Next-best-account flow** with explicit loading / done / error states.
- **Accounts → Action Queue navigation** with all edge cases (visible / hidden by filter / not in queue / navigation failure).
- **Account Detail Panel** with activation timeline.
- **Performance:** infinite scroll (50-row batches via IntersectionObserver) on Action Queue and Accounts so 300+ records render smoothly.
- **Routing, layout, sidebar, settings page.**
- **Analytics surface:** KPI row + CSM performance panel rendered above the Action Queue, derived from RLS-scoped data.
- **Resilience layer:** global `OfflineBanner` driven by `navigator.onLine`; offline-safe sign-out (`scope: "local"`) so the user is never trapped; session-expiry toast in `AuthProvider` for silent token-refresh failures; structured error classification in `useAccountsData` (offline / timeout / server / unknown) with a 10 s timeout race on the Supabase fetch.
- **Seeded demo data:** 4 demo CSMs (created via the `seed-demo-csms` edge function) and 300 unique B2B SaaS accounts distributed across them with realistic risk, status, ARR, signup-date, and outreach-timestamp distributions, plus seeded activity log entries.

### 9.2 Mocked / Simulated
- **AI message generation** in the Outreach Modal — simulated locally (variable latency, ~15 % failure). The 2 s timeout and fallback paths are real and behave identically to a live integration.
- **Sending outreach** — no real email is sent; the action updates database state and writes an activity log entry.
- **Account & user data** — generated seed data, not real customers.
- **User quotes** — hand-curated strings drawn from churn/retention research, attached to a subset of accounts.
- **Risk-level signals** — derived from seeded fields (invites sent, active users, last activity); no real product-telemetry feed.

### 9.3 Not yet built (explicitly out of scope)
- Real AI Gateway integration for outreach generation.
- Real email/Slack send for outreach and invite prompts.
- Admin UI for assigning accounts to CSMs (today this is done at seed time / via SQL).
- Analytics instrumentation pipeline (events are discrete and instrumentation-ready, but not wired).
- Saved filter presets, role-based permissions beyond `csm` / `admin`, team-wide queues, account reassignment workflow.
- Telemetry-driven risk scoring (current risk is from seeded fields).

> See **`HANDOFF.md` → Known gaps before production** for the engineering-side list (optimistic-update rollback, 1000-row pagination, `AbortController` on fetches, cross-tab sign-out, realtime subscriptions, observability, test coverage, a11y/i18n).

---

## 10. Build Principles (as implemented)

- **Real auth, real DB, real RLS.** Account scoping is enforced at the database, not in the client.
- **Single source of truth for "Contacted Today".** A row-level `last_outreach_sent_at` timestamp drives both the per-row badge and the aggregate metric. Re-sending to the same account today does not double-count.
- **No dashboards, no charts.** The product is a decision + action engine.
- **Prioritization over filtering.** Pre-sorted on load (actionable → risk → inactivity); filters refine, not configure.
- **Evidence inline.** Stats + insight + verbatim quote on every row.
- **Constrained action set.** Small, state-aware CTAs so the experiment measures intent cleanly.
- **Status-driven demotion, not deletion.** Progress stays visible.
- **AI is assistive, never required.** Default templates, 2 s timeout, never overwrite user input.
- **Action and log are decoupled.** A failed log write never blocks a real intervention.
- **Explicit edge states, not silent failures.** Every loading, empty, and failure path has its own UI.
- **Performance with scale.** Incremental rendering keeps the DOM small at 300+ accounts.

---

## 11. Tech Stack

React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Router · TanStack Query · **Supabase (Postgres + Auth + Edge Functions + RLS)**

---

*End of PRD — current prototype state.*
