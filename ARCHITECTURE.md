# RetainIQ — Architecture

This document describes the codebase layout, the runtime flow, and the conventions
used after the M3 refactor. For the product narrative, see `README.md`. For the
PRD, see `PRD.md`.

---

## Folder structure

```
src/
├── App.tsx                  Top-level router. Wires routes to feature pages.
├── main.tsx                 Vite entry point.
├── index.css                Global styles + design tokens (HSL semantic vars).
│
├── features/                One folder per product capability.
│   ├── action-queue/        Primary screen — prioritized list of at-risk accounts.
│   │   ├── ActionQueuePage.tsx       Page-level orchestrator + state container.
│   │   ├── components/
│   │   │   └── ActionQueueRow.tsx    Single queue row (was AccountCard).
│   │   └── queueLogic.ts             Pure sort/filter/select helpers (testable).
│   │
│   ├── account-detail/      Side-panel deep-dive on one account.
│   │   ├── AccountDetailPanel.tsx    Pure presentation.
│   │   └── timeline.ts               buildTimeline + buildInsights (pure data).
│   │
│   ├── outreach/            "Send Outreach" modal.
│   │   ├── OutreachModal.tsx         Compose UI + send/generation state.
│   │   ├── outreachApi.ts            Simulated AI generator + send (data layer).
│   │   └── template.ts               Default pre-fill template.
│   │
│   ├── prompt-invite/       "Prompt Invite" modal.
│   │   └── PromptInviteModal.tsx
│   │
│   ├── outcome/             Post-outreach outcome capture modal.
│   │   ├── OutcomeModal.tsx
│   │   └── outcomeTypes.ts           Status enums + mappings (pure types/data).
│   │
│   ├── snooze/              Snooze modal.
│   │   ├── SnoozeModal.tsx
│   │   └── snoozeOptions.ts          Durations, reasons, computeSnoozeUntil().
│   │
│   ├── next-best-account/   Modal that lines up the next intervention.
│   │   └── NextBestAccountModal.tsx
│   │
│   ├── accounts/            Full account list page.
│   │   └── AccountsPage.tsx
│   │
│   ├── activity-log/        Read-only audit trail of CSM actions.
│   │   ├── ActivityLogPage.tsx
│   │   ├── activityStore.ts          In-memory + localStorage pub/sub store.
│   │   ├── useActivityLog.ts         Hook subscribing to the store.
│   │   └── safeLog.tsx               Action-then-log helper with retry toast.
│   │
│   └── settings/            Settings page.
│       └── SettingsPage.tsx
│
├── shared/                  Cross-feature, no business logic.
│   ├── components/          AppLayout, AppSidebar, NavLink, EmptyState.
│   └── data/
│       └── accounts/        Account types + mock data generator.
│           ├── types.ts                Account, RiskLevel, AccountStatus types.
│           ├── mockAccounts.ts         generateAccounts(), seedActivityLog.
│           └── index.ts                Barrel re-export.
│
├── components/ui/           shadcn primitives (vendored, do not edit).
├── hooks/                   App-wide hooks (use-toast, use-mobile).
├── lib/utils.ts             cn() helper.
└── pages/NotFound.tsx       404 fallback.
```

### Convention

Each feature folder owns:
- One **page** or **modal** (presentation).
- A sibling **`*.ts`** file for any non-trivial pure logic (sorting, templating,
  enum mappings, simulated APIs). Components import from these — never inline.
- Optionally a **`components/`** subfolder for sub-pieces that are private to
  the feature (e.g. `ActionQueueRow`).

Cross-feature primitives (layout, sidebar, generic empty state, data types,
mock data) live under `src/shared/`. shadcn primitives stay under
`src/components/ui/` because they are vendored and untouched.

---

## Runtime flow

### 1. App boot
`main.tsx` → `App.tsx` mounts the router and global providers
(`QueryClientProvider`, `TooltipProvider`, `Toaster`s). Four routes:

| Path        | Component             |
| ----------- | --------------------- |
| `/`         | `ActionQueuePage`     |
| `/accounts` | `AccountsPage`        |
| `/activity` | `ActivityLogPage`     |
| `/settings` | `SettingsPage`        |

### 2. Action Queue (the heart of the product)

`ActionQueuePage` is the central state container. It owns:
- The list of `accounts` (loaded from `mockAccounts`).
- Currently open modal/panel (outreach, outcome, prompt, snooze, detail, next-best).
- Filter state (risk, status), bulk-selection state, snooze/follow-up dates.

It delegates all derivations to **`queueLogic.ts`**:
- `selectQueue(accounts, riskFilter, statusFilter)` — sort + filter rows.
- `computeRiskCounts` / `computeStatusCounts` — counts for filter chips.
- `pickNextBestCandidate` — chooses the next account for the momentum modal.

### 3. Action lifecycle

For every CSM action:

```
User clicks  →  ActionQueuePage handler
            →  safeLog(toast, () => updateAccount(...), { type, account, ... })
            →  activityStore.log(...)         (persists + notifies subscribers)
            →  ActivityLogPage re-renders     (via useActivityLog)
            →  advanceToNextBestAccount()     (where applicable)
            →  NextBestAccountModal opens
```

`safeLog` (in `features/activity-log/safeLog.tsx`) guarantees three things:
1. The user-facing action runs first.
2. The activity-log write only happens if the store persists successfully.
3. On persist failure, a non-blocking warning toast offers a retry — the
   underlying action is never reverted.

### 4. Outreach modal — separated data layer

`OutreachModal.tsx` is presentation + local state only. The data side lives in:
- **`template.ts`** — `buildDefaultTemplate(account)` so the textarea is
  always pre-filled instantly.
- **`outreachApi.ts`** — `generateSuggestedMessage(account)` (simulated AI,
  variable latency, ~15% failure) and `performSend()` (~30% failure).
  `GENERATION_TIMEOUT_MS = 2000` caps the loading state.

Generation is **always non-blocking**: the modal renders the default template
immediately, kicks off generation, and only swaps in the AI suggestion if
(a) it lands and (b) the user hasn't started typing.

### 5. Account detail panel

`AccountDetailPanel.tsx` is pure presentation. All derived data
(activation timeline, risk insights) is built in `timeline.ts`:
- `buildTimeline(account): TimelineEvent[]`
- `buildInsights(account): string[]`

These are pure functions — no React, easy to unit test.

---

## Naming conventions

| Kind                 | Suffix            | Example                                |
| -------------------- | ----------------- | -------------------------------------- |
| Route component      | `Page`            | `ActionQueuePage`, `SettingsPage`      |
| Modal                | `Modal`           | `OutreachModal`, `SnoozeModal`         |
| Side panel           | `Panel`           | `AccountDetailPanel`                   |
| Queue row            | `Row`             | `ActionQueueRow` (was `AccountCard`)   |
| Pure logic file      | descriptive `.ts` | `queueLogic.ts`, `timeline.ts`         |
| Simulated API file   | `*Api.ts`         | `outreachApi.ts`                       |

---

## What is mocked vs real

| Real (UI/state)                                  | Mocked (data layer)                              |
| ------------------------------------------------ | ------------------------------------------------ |
| All routing, components, sorting, filtering      | `mockAccounts` — generated on import             |
| Activity store with localStorage persistence     | Simulated AI generator (`outreachApi.ts`)        |
| All loading/empty/error states                   | Simulated send (`performSend`)                   |
| Filter-aware account updates and toasts          | Simulated next-best lookup latency + ~10% errors |

To wire to a real backend, swap the contents of:
- `shared/data/accounts/mockAccounts.ts` → fetch from API.
- `features/outreach/outreachApi.ts` → real AI + email API calls.
- `features/activity-log/activityStore.ts` → persist to backend instead of localStorage.

The component tree does not need to change.

---

## Adding a new feature

1. Create `src/features/<feature-name>/`.
2. Add the page or modal component there.
3. Move any non-trivial pure logic into a sibling `.ts` file.
4. If it's a route, register it in `src/App.tsx` and add the nav item in
   `src/shared/components/AppSidebar.tsx`.
5. Reuse `AppLayout`, `EmptyState`, and the `Account` types from
   `src/shared/`. Don't duplicate them.
