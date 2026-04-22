# RetainIQ — CSM Intervention Tool

A focused Customer Success workflow tool (Gainsight-inspired, but **not** a dashboard) built to test a specific churn-prevention hypothesis.

## Hypothesis

> If CSMs are presented with a prioritized list of accounts that have not invited teammates within 3–5 days of signup, then at least **60% of them will take or clearly commit to a specific action**, because early team activation is a strong predictor of retention and this insight is not clearly surfaced today.

## Scenario

CSMs at a B2B SaaS company log in each morning asking one question: *"What should I do today to prevent churn?"*

Today, that signal is buried across dashboards, health scores, and reports. RetainIQ replaces passive analytics with a **prioritized action queue** — accounts at risk because they have not activated their team — and pairs each one with the context, evidence, and one-click actions a CSM needs to intervene immediately.

## Key Screens

### 1. Action Queue (primary screen, `/`)
The heart of the product. A prioritized list of accounts requiring attention, sorted by status then risk.
- Risk badges (🔴 High / 🟡 Medium / 🟢 Healthy)
- Stats inline: days since signup, invites sent, active users, last activity, ARR
- Context insight per account (e.g. *"Accounts like this churn at 78%"*)
- Real user quotes pulled from churn/retention research
- Status-aware primary actions: **Send Outreach**, **Prompt Invite**, **Mark Reviewed**, **Snooze**, **Resume**
- Filter chips for risk level and queue status; bulk-select supported
- Summary bar: count of accounts needing action, high-risk total, contacted today

### 2. Account Detail Panel (side panel)
Opens on row click. Shows activation timeline (signed up → first task → invites sent), key stats, and retention insights derived from the account's signals.

### 3. Outreach Modal
Opens instantly with a **default pre-filled message** so the CSM is never blocked. An AI suggestion is fetched in the background (2s timeout, ~15% simulated failure) and only swapped in if it lands before the user starts typing. Send is always enabled. On send, the account is marked *Contacted* and demoted in the queue.

### 4. Prompt Invite Modal
Suggests a low-friction invite-link message the CSM can copy and forward to the customer.

### 5. Outcome Modal
Captured after an outreach send to record the result (replied, no response, meeting booked, etc.) and update the account's status accordingly.

### 6. Snooze Modal
Defers an account for a configurable duration with an optional reason. Snoozed accounts dim and sink in the queue but stay visible.

### 7. Next-Best-Account Modal
After an action completes, surfaces the next highest-priority account so the CSM keeps momentum without returning to the full queue.

### 8. Secondary pages
- **Accounts** (`/accounts`) — full account table view
- **Activity Log** (`/activity`) — read-only audit trail of every CSM action (persisted to localStorage)
- **Settings** (`/settings`) — risk threshold configuration

## User Flow

1. CSM lands on **Action Queue** (default route, highlighted in sidebar).
2. Scans the prioritized list — high-risk, no-invite accounts surface first; processed rows sink to the bottom.
3. Reads the contextual insight + user quote to build conviction.
4. Optionally clicks the row to open the **Account Detail Panel** for the activation timeline.
5. Takes one of the available actions:
   - **Send Outreach** → edits the pre-filled (or AI-suggested) message → sends → records outcome → account marked *Contacted* and demoted.
   - **Prompt Invite** → copies a suggested invite message to forward.
   - **Snooze** → defers the account for a chosen duration.
   - **Mark Reviewed** → dismisses without contact.
6. **Next-Best-Account Modal** lines up the next intervention; CSM continues until the queue is cleared.
7. Every action is written to the **Activity Log** for later review.

## Main Build Decisions

- **No dashboards, no charts.** The product is a decision + action engine. Every pixel pushes toward an intervention, not a report.
- **Prioritization over filtering.** Accounts are pre-sorted by status then risk so the CSM never has to configure a view.
- **Evidence inline.** Churn statistics and verbatim user quotes appear on every row to justify the recommended action — conviction is built where the decision is made.
- **Constrained action set.** Send Outreach, Prompt Invite, Snooze, Mark Reviewed. Constraint forces the experiment to measure intent clearly.
- **Status-driven demotion.** Contacted/Reviewed/Snoozed accounts dim and move down rather than disappear, so the CSM sees their progress through the queue.
- **AI is assistive, never blocking.** The Outreach Modal opens with a default template instantly; the AI suggestion is a background enhancement with a 2s cap and graceful fallback. The Send button is always live.
- **Momentum loop.** The Next-Best-Account Modal keeps the CSM in flow rather than dumping them back at the queue between every action.
- **Resilient logging.** Actions run first; the Activity Log write is attempted afterward via a `safeLog` helper that surfaces a retry toast on failure but never reverts the underlying action.
- **Gainsight-inspired layout** (left sidebar, top header, content area) with a neutral enterprise palette — familiar to the target user without the dashboard clutter.
- **Semantic design tokens.** All colors are HSL tokens defined in `index.css` / `tailwind.config.ts` (`risk-high`, `badge-urgent-bg`, etc.) so risk semantics are consistent across components.
- **Mock data tuned to the hypothesis.** ~42 accounts generated with only ~12% having invited teammates, mirroring the real-world activation gap the tool is designed to surface.
- **Feature-based architecture.** Each capability (`action-queue`, `outreach`, `activity-log`, …) lives in its own folder under `src/features/`, with pure logic separated into sibling `.ts` files (`queueLogic.ts`, `timeline.ts`, `outreachApi.ts`). See `ARCHITECTURE.md` for the full layout.
- **Instrumentation-ready.** Action buttons, row clicks, and modal sends are discrete events — easy to wire to analytics to measure the 60% action-rate target.

## Project Structure

```
src/
├── features/        One folder per capability (action-queue, outreach, …)
├── shared/          Cross-feature layout, nav, types, mock data
├── components/ui/   shadcn primitives (vendored)
├── hooks/  lib/  pages/
└── App.tsx          Router
```

See **`ARCHITECTURE.md`** for the full folder map, runtime flow, naming conventions, and what's mocked vs. real.

## Tech Stack

React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Router · TanStack Query
