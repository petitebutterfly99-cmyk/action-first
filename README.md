# RetainIQ — CSM Intervention Tool

A focused Customer Success workflow tool (Gainsight-inspired, but **not** a dashboard) built to test a specific churn-prevention hypothesis. Each Customer Success Manager logs in, sees only their assigned accounts, and is pushed straight into a prioritized action queue.

## Hypothesis

> If CSMs are presented with a prioritized list of accounts that have not invited teammates within 3–5 days of signup, then at least **60% of them will take or clearly commit to a specific action**, because early team activation is a strong predictor of retention and this insight is not clearly surfaced today.

## Scenario

CSMs at a B2B SaaS company log in each morning asking one question: *"What should I do today to prevent churn?"*

Today, that signal is buried across dashboards, health scores, and reports. RetainIQ replaces passive analytics with a **prioritized action queue** — each CSM's own assigned accounts at risk because they have not activated their team — and pairs every row with the context, evidence, and one-click actions needed to intervene immediately.

The prototype ships with **4 demo CSMs** and **300 seeded B2B SaaS accounts** distributed across them, so each login lands on a realistic portfolio.

## Demo Login

Sign in at `/login` with any of the seeded CSM accounts (shared password: **`demo1234`**):

- `sarah.chen@demo.app`
- `marcus.rivera@demo.app`
- `priya.patel@demo.app`
- `daniel.kim@demo.app`

New users can sign up — they default to role `csm` with zero assigned accounts until an admin assigns them.

## Key Screens

### 1. Authentication (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
Real Supabase Auth (email + password). All app routes are protected; unauthenticated users are redirected to `/login`. Authenticated users land on the Action Queue.

### 2. Action Queue — primary screen (`/`)
The heart of the product. A prioritized list of **the logged-in CSM's assigned accounts**, sorted by status then risk.

- Risk badges (🔴 High / 🟡 Medium / 🟢 Healthy)
- Stats inline: days since signup, invites sent, active users, last activity, ARR
- Contextual insight per account (e.g. *"Accounts like this churn at 78%"*)
- Verbatim user quotes pulled from churn/retention research
- State-aware primary CTA per row: **Send Outreach** → **Log Outcome** → **Follow Up** → **Reopen** / **Resume**
- Filter chips for risk level and queue status (with live counts) + bulk-select bar
- Summary metrics: accounts needing action, high-risk count, **Contacted Today** (derived from `last_outreach_sent_at` on each row, never double-counts)
- **Infinite scroll** — first 50 rows render, next 50 load as a sentinel near the bottom enters the viewport, so the page stays snappy with 300+ accounts
- Dedicated empty state for CSMs with no assignments: *"No assigned accounts — Contact admin"*
- **Structured error states** for offline / timeout / server failures (e.g. *"Service Temporarily Unavailable"*) with Retry, distinguished from the generic "Couldn't load" path

### 3. Account Detail Panel (side panel)
Opens on row click. Activation timeline (signed up → first task → invites sent), key stats, and retention insights derived from the account's signals.

### 4. Outreach Modal
Opens instantly with a **default pre-filled message** so the CSM is never blocked. An AI suggestion is fetched in the background (2 s timeout, ~15 % simulated failure) and only swapped in if it lands before the user starts typing. Send is always enabled. On send, the row atomically updates: status → *Contacted*, `last_outreach_sent_at` → now, `outreach_count` increments.

### 5. Outcome Modal
Opens after a successful outreach. Captures the result (replied, no response, follow-up needed, meeting booked) and updates the row's status accordingly.

### 6. Prompt Invite Modal
Suggests a low-friction invite-link message the CSM can copy and forward to the customer.

### 7. Snooze Modal
Defers an account for a configurable duration with an optional reason. Snoozed accounts dim and sink in the queue but stay visible.

### 8. Next-Best-Account Modal
After an action completes, surfaces the next highest-priority account in the CSM's portfolio so they keep momentum without returning to the full queue. Explicit loading / *still searching…* / *done for now* / *couldn't load next* states.

### 9. Accounts (`/accounts`)
Full table view of the CSM's portfolio with infinite scroll. Includes **View in Action Queue** with edge cases for "not in current filter" and "not in queue."

### 10. Activity Log (`/activity`)
Read-only audit trail of the CSM's actions and any actions on their assigned accounts, persisted in Supabase.

### 11. Settings (`/settings`)
Risk threshold configuration and per-user preferences (persisted via `useUserSettings`; thresholds are stored but not yet consumed by risk recomputation).

### 12. Analytics
A KPI row and CSM performance panel (`features/analytics/`) surface aggregate action funnel metrics and per-CSM rates inline above the queue — read-only, derived from the same RLS-scoped data.

## User Flow

1. CSM logs in at `/login` → redirected to **Action Queue**.
2. Sees only **their assigned accounts** (RLS-enforced).
3. Scans the prioritized list — high-risk, no-invite accounts surface first; processed rows dim and sink to the bottom.
4. Reads the contextual insight + user quote to build conviction.
5. Optionally clicks the row to open the **Account Detail Panel** for the activation timeline.
6. Takes one of the available actions:
   - **Send Outreach** → edits the pre-filled (or AI-suggested) message → sends → records outcome → row marked *Contacted* and demoted; **Contacted Today** metric ticks up immediately.
   - **Prompt Invite** → copies a suggested invite message to forward.
   - **Snooze** → defers the account for a chosen duration.
   - **Mark Reviewed** → dismisses without contact.
7. **Next-Best-Account Modal** lines up the next intervention; CSM continues until the queue is cleared.
8. Every action is written to the **Activity Log** for later review.
9. Logout returns the user to `/login`.

## Main Build Decisions

- **Real auth, real DB, real RLS.** Supabase Auth + a Postgres `profiles` table (auto-created on signup via trigger). `accounts.assigned_csm_id` plus row-level security policies (`assigned_csm_id = auth.uid()`) enforce account scoping at the database, not in the client.
- **Single source of truth for "Contacted Today".** A row-level `last_outreach_sent_at` timestamp drives both the per-row *"Contacted today"* badge and the aggregate metric. Re-sending to the same account today does not double-count.
- **No dashboards, no charts.** The product is a decision + action engine. Every pixel pushes toward an intervention, not a report.
- **Prioritization over filtering.** Accounts are pre-sorted by status then risk so the CSM never has to configure a view.
- **Evidence inline.** Churn statistics and verbatim user quotes appear on every row to justify the recommended action — conviction is built where the decision is made.
- **Constrained action set.** Send Outreach, Prompt Invite, Snooze, Mark Reviewed, Log Outcome. Forces the experiment to measure intent clearly.
- **Status-driven demotion.** Contacted/Reviewed/Snoozed accounts dim and move down rather than disappear, so the CSM sees their progress through the queue.
- **AI is assistive, never blocking.** The Outreach Modal opens with a default template instantly; the AI suggestion is a background enhancement with a 2 s cap and graceful fallback. The Send button is always live.
- **Momentum loop.** The Next-Best-Account Modal keeps the CSM in flow rather than dumping them back at the queue between actions.
- **Resilient logging.** Actions run first; the Activity Log write is attempted afterward via a `safeLog` helper that surfaces a retry toast on failure but never reverts the underlying action.
- **Resilience surfaces.** A global `OfflineBanner` flags lost connectivity, sign-out works while offline, and a session-expiry toast (in `AuthProvider`) makes silent token-refresh failures legible. Account-level fetches classify errors into offline / timeout / server states with specific copy.
- **Performance with scale.** Infinite scroll (`useInfiniteList`, 50-row batches with an IntersectionObserver sentinel) keeps the DOM small even with hundreds of accounts per CSM.
- **Gainsight-inspired layout** (left sidebar, top header, content area) with a neutral enterprise palette — familiar to the target user without the dashboard clutter.
- **Semantic design tokens.** All colors are HSL tokens defined in `index.css` / `tailwind.config.ts` (`risk-high`, `badge-urgent-bg`, etc.) so risk semantics are consistent across components.
- **Realistic seed data.** 300 unique B2B SaaS accounts (60–120 per CSM) generated with believable name patterns, ARR ranges, risk distributions (~35 % high / ~35 % medium / ~30 % healthy), queue-status mix, and outreach timestamps that include "today" entries to power the metric.
- **Feature-based architecture.** Each capability (`auth`, `action-queue`, `outreach`, `activity-log`, …) lives in its own folder under `src/features/`, with pure logic separated into sibling `.ts` files (`queueLogic.ts`, `timeline.ts`, `outreachApi.ts`). See `ARCHITECTURE.md` for the full layout.
- **Instrumentation-ready.** Action buttons, row clicks, and modal sends are discrete events — easy to wire to analytics to measure the 60 % action-rate target.

## Project Structure

```
src/
├── features/        One folder per capability (auth, action-queue, outreach, …)
├── shared/          Cross-feature layout, nav, hooks (useInfiniteList), data layer
├── components/ui/   shadcn primitives (vendored)
├── integrations/    Supabase client + generated DB types (do not edit)
├── hooks/  lib/  pages/
└── App.tsx          Router + ProtectedRoute wiring

supabase/
├── functions/       Edge functions (e.g. seed-demo-csms)
├── migrations/      SQL schema migrations (auth, profiles, RLS, accounts)
└── config.toml
```

See **`ARCHITECTURE.md`** for the full folder map, runtime flow, naming conventions, and what's mocked vs. real.

## Data Model (Supabase)

| Table          | Purpose                                                    | RLS                                                  |
| -------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `profiles`     | One row per auth user (id, full_name, email, role)         | User can view/update their own row                   |
| `accounts`     | Customer accounts with risk, status, outreach timestamps   | CSM sees/edits rows where `assigned_csm_id = uid()`  |
| `activity_log` | Audit trail of CSM actions                                 | CSM sees rows for accounts they own                  |

Enums: `app_role` (`csm` | `admin`), `risk_level` (`high` | `medium` | `low`), `account_status` (`needs_action` | `contacted` | `reviewed` | `snoozed` | `follow_up_needed`), `activity_action_type`.

## Tech Stack

React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Router · TanStack Query · **Supabase (Postgres + Auth + Edge Functions + RLS)**
