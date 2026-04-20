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
- Stats inline: day since signup, invites sent, active users, last activity, ARR
- Context insight per account (e.g. *"Accounts like this churn at 78%"*)
- Real user quotes pulled from churn/retention research
- Three primary actions: **Send Outreach**, **Prompt Invite**, **Mark Reviewed**
- Summary bar: count of accounts needing action, high-risk total, contacted today

### 2. Account Detail Panel (side panel)
Opens on row click. Shows activation timeline (signed up → first task → invites), key stats, and a retention insight.

### 3. Outreach Modal
Pre-filled, editable message addressed to the account contact. Sending marks the account as **Contacted** and demotes it in the queue.

### 4. Prompt Invite Modal
Suggests a low-friction invite-link message the CSM can forward to the customer.

### 5. Secondary pages
- **Accounts** — full account table view
- **Activity Log** — record of CSM actions taken
- **Settings** — risk threshold configuration

## User Flow

1. CSM lands on **Action Queue** (default route, highlighted in sidebar).
2. Scans the prioritized list — high-risk, no-invite accounts surface first.
3. Reads the contextual insight + user quote to build conviction.
4. Optionally clicks the row to open the **detail panel** for the activation timeline.
5. Takes one of three actions:
   - **Send Outreach** → edits the pre-filled message → sends → account marked *Contacted* and demoted.
   - **Prompt Invite** → copies a suggested invite message to forward.
   - **Mark Reviewed** → dismisses without contact.
6. Queue re-sorts; CSM moves to the next account.

## Main Build Decisions

- **No dashboards, no charts.** The product is a decision + action engine. Every pixel pushes toward an intervention, not a report.
- **Prioritization over filtering.** Accounts are pre-sorted by status then risk so the CSM never has to configure a view.
- **Evidence inline.** Churn statistics and verbatim user quotes appear on every card to justify the recommended action — conviction is built where the decision is made.
- **Three actions, not ten.** Send Outreach, Prompt Invite, Mark Reviewed. Constraint forces the experiment to measure intent clearly.
- **Status-driven demotion.** Contacted/Reviewed accounts dim and move down rather than disappear, so the CSM sees their progress through the queue.
- **Gainsight-inspired layout** (left sidebar, top header, content area) with a neutral enterprise palette — familiar to the target user without the dashboard clutter.
- **Semantic design tokens.** All colors are HSL tokens defined in `index.css` / `tailwind.config.ts` (`risk-high`, `badge-urgent-bg`, etc.) so risk semantics are consistent across components.
- **Mock data tuned to the hypothesis.** ~42 accounts generated with only ~12% having invited teammates, mirroring the real-world activation gap the tool is designed to surface.
- **Instrumentation-ready.** Action buttons, row clicks, and modal sends are discrete events — easy to wire to analytics to measure the 60% action-rate target.

## Tech Stack

React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Router · TanStack Query
