# RetainIQ — Architecture

This document describes the codebase layout, the runtime flow, and the
conventions used by the current Cloud-backed prototype. For the product
narrative see `README.md`; for the PRD see `PRD.md`; for the production-
readiness audit see `HANDOFF.md`.

---

## Folder structure

```
src/
├── App.tsx                  Router + global providers. Wraps app routes in
│                            <ProtectedRoute>, public auth routes in
│                            <PublicOnlyRoute>. Mounts <OfflineBanner>.
├── main.tsx                 Vite entry point.
├── index.css                Global styles + design tokens (HSL semantic vars).
│
├── features/                One folder per product capability.
│   │                        Inside each feature: components/, hooks/, api/,
│   │                        and (where useful) types/. Index re-exports the
│   │                        public surface.
│   │
│   ├── auth/                Supabase Auth — login/signup/reset + session.
│   │   └── components/      AuthProvider, ProtectedRoute, PublicOnlyRoute,
│   │                        LoginPage, SignupPage, ForgotPasswordPage,
│   │                        ResetPasswordPage.
│   │
│   ├── action-queue/        Primary screen — prioritized list of accounts.
│   │   ├── components/      ActionQueuePage, ActionQueueRow.
│   │   ├── hooks/           useAccountsData (Cloud fetch + error classify),
│   │   │                    useActionQueueController (orchestrates modals
│   │   │                    + state), useBulkSelection, useFocusFromUrl,
│   │   │                    useNextBestAccount.
│   │   └── api/             queueLogic.ts (pure sort/filter/select).
│   │
│   ├── account-detail/      Side panel deep-dive on one account.
│   │   ├── components/      AccountDetailPanel.
│   │   ├── hooks/           useBenchmarks.
│   │   └── api/             timeline.ts (buildTimeline, buildInsights — pure).
│   │
│   ├── outreach/            "Send Outreach" modal.
│   │   ├── components/      OutreachModal.
│   │   └── api/             outreachApi.ts (simulated AI + send),
│   │                        template.ts (default pre-fill).
│   │
│   ├── outcome/             Post-outreach outcome capture modal.
│   │   ├── components/      OutcomeModal.
│   │   └── types/           outcomeTypes.ts (enums + status mappings).
│   │
│   ├── prompt-invite/       "Prompt Invite" modal.
│   │   └── components/      PromptInviteModal.
│   │
│   ├── snooze/              Snooze modal.
│   │   ├── components/      SnoozeModal.
│   │   └── api/             snoozeOptions.ts (durations, computeSnoozeUntil).
│   │
│   ├── next-best-account/   Modal that lines up the next intervention.
│   │   └── components/      NextBestAccountModal.
│   │
│   ├── accounts/            Full account list page.
│   │   └── components/      AccountsPage.
│   │
│   ├── activity-log/        Audit trail of CSM actions (Cloud-backed).
│   │   ├── components/      ActivityLogPage.
│   │   ├── hooks/           useActivityLog (subscribes to store).
│   │   └── api/             activityStore.ts (hydrates from Supabase,
│   │                        pub/sub locally), safeLog.tsx (action-then-log
│   │                        helper with retry toast).
│   │
│   ├── analytics/           KPI row + per-CSM performance panel above the
│   │   │                    Action Queue.
│   │   ├── components/      KpiRow, CsmPerformancePanel.
│   │   ├── hooks/           useMetrics, useSession.
│   │   └── api/             eventsApi.ts.
│   │
│   └── settings/            Settings page.
│       ├── components/      SettingsPage.
│       └── hooks/           useUserSettings (per-user preferences,
│                            persisted; risk thresholds not yet consumed).
│
├── shared/                  Cross-feature, no business logic.
│   ├── components/          AppLayout, AppSidebar, NavLink, EmptyState,
│   │                        OfflineBanner (navigator.onLine watcher).
│   ├── hooks/               useInfiniteList (50-row IntersectionObserver
│   │                        windowing for Action Queue + Accounts).
│   └── data/
│       └── accounts/        Account types + Cloud-backed loader.
│           ├── types.ts             Account, RiskLevel, AccountStatus.
│           ├── accountsApi.ts       fetchAccounts, updateAccountInDb,
│           │                        bulkUpdateAccountsInDb (Supabase + RLS).
│           └── index.ts             Barrel re-export.
│
├── integrations/supabase/   Auto-generated Supabase client + DB types.
│   ├── client.ts            Do not edit — generated.
│   └── types.ts             Do not edit — generated from schema.
│
├── components/ui/           shadcn primitives (vendored, do not edit).
├── hooks/                   App-wide hooks (use-toast, use-mobile).
├── lib/utils.ts             cn() helper.
└── pages/NotFound.tsx       404 fallback.

supabase/
├── functions/               Edge functions (e.g. seed-demo-csms).
├── migrations/              SQL — auth, profiles, RLS policies, accounts,
│                            activity_log, triggers.
└── config.toml              Project + per-function config.
```

### Convention

Each feature folder owns a consistent shape:

- **`components/`** — page, modal, panel, or row React components.
- **`hooks/`** — `useXxx.ts` hooks for data fetching, state orchestration,
  and effects scoped to the feature.
- **`api/`** — non-React data-layer modules: pure logic (`queueLogic.ts`),
  network calls (`accountsApi.ts`, `outreachApi.ts`), or store
  implementations (`activityStore.ts`).
- **`types/`** — when a feature has enough type/enum surface to warrant its
  own file (e.g. `outcomeTypes.ts`).
- **`index.ts`** — barrel exporting the public surface (pages, modals, the
  occasional hook). Other features import from the barrel, never from
  internal paths.

Cross-feature primitives (layout, sidebar, generic empty state, account
types, the offline banner, the infinite-list hook) live under `src/shared/`.
shadcn primitives stay under `src/components/ui/` because they are vendored.

---

## Runtime flow

### 1. App boot

`main.tsx` → `App.tsx` mounts global providers (`QueryClientProvider`,
`TooltipProvider`, both `Toaster`s) and the global `<OfflineBanner>`. The
router is wrapped in `<AuthProvider>`, and every app route is gated by
`<ProtectedRoute>`. Auth screens use `<PublicOnlyRoute>` so a signed-in user
hitting `/login` is bounced to `/`.

| Path                | Component             | Wrapper             |
| ------------------- | --------------------- | ------------------- |
| `/login`            | `LoginPage`           | `PublicOnlyRoute`   |
| `/signup`           | `SignupPage`          | `PublicOnlyRoute`   |
| `/forgot-password`  | `ForgotPasswordPage`  | `PublicOnlyRoute`   |
| `/reset-password`   | `ResetPasswordPage`   | none (token in URL) |
| `/`                 | `ActionQueuePage`     | `ProtectedRoute`    |
| `/accounts`         | `AccountsPage`        | `ProtectedRoute`    |
| `/activity`         | `ActivityLogPage`     | `ProtectedRoute`    |
| `/settings`         | `SettingsPage`        | `ProtectedRoute`    |
| `*`                 | `NotFound`            | none                |

### 2. Auth layer

`AuthProvider` (`features/auth/components/AuthProvider.tsx`) is the session
source of truth:

- On mount: registers `supabase.auth.onAuthStateChange` **first**, then calls
  `getSession()` to hydrate the initial session (recommended order — avoids
  missing the synthetic `INITIAL_SESSION` event).
- On every auth change: defers profile fetch + `activityStore.hydrate()` via
  `setTimeout(0)` to avoid deadlocking inside the Supabase callback.
- On silent token-refresh failure (event without a session, after we'd
  previously seen one): fires a one-shot **session-expiry toast** so the
  redirect to `/login` is never unexplained.
- `signOut` clears local state immediately and calls
  `supabase.auth.signOut({ scope: "local" })` so **sign-out works while
  offline** — the user is never trapped by connectivity loss.
- Returns a safe fallback when `useAuth` is called outside the provider
  (HMR safety).

`ProtectedRoute` reads `useAuth()`, shows a loading state while
`loading === true`, then either renders children or `<Navigate to="/login">`.

### 3. Data layer (Cloud-backed)

Account data is real Supabase, RLS-scoped to `assigned_csm_id = auth.uid()`. Admin-only writes (e.g. `benchmarks`) and the `user_roles` table are gated by the `SECURITY DEFINER` `has_role()` function — see `HANDOFF.md` → "Security posture" for the full security model:

```
useAccountsData (hook)
   └─ TanStack Query → fetchAccounts()           (shared/data/accounts/accountsApi.ts)
                       └─ supabase.from("accounts").select("*")
                       └─ rowToAccount(row)      (DB shape → Account shape)
   └─ withTimeout(10s)                          ← race against slow connections
   └─ classifyError(e)                          ← offline / timeout / server / unknown
```

`accountsApi.ts` exposes three functions — `fetchAccounts`,
`updateAccountInDb`, `bulkUpdateAccountsInDb` — and is the single seam for
account I/O. `accountUpdateToRow` translates the in-app `Account` shape to
the snake_case DB columns so the rest of the app stays in camelCase.

### 4. Action Queue (the heart of the product)

`ActionQueuePage` is the orchestrator. It composes hooks rather than owning
state directly:

- **`useAccountsData`** — fetch + error state + retry.
- **`useActionQueueController`** — modal toggles, action handlers, status
  transitions, optimistic updates.
- **`useBulkSelection`** — multi-select state and bulk actions.
- **`useFocusFromUrl`** — `?focus=<id>` deep-linking; expands the infinite-
  scroll window so the targeted row is rendered before scrolling.
- **`useNextBestAccount`** — picks the next intervention candidate.
- **`useInfiniteList`** (from `shared/hooks/`) — 50-row windowing with an
  IntersectionObserver sentinel; resets when filters change.

All pure derivations (sort, filter, counts, next-best pick) stay in
**`api/queueLogic.ts`** — never inlined.

### 5. Action lifecycle

For every CSM action:

```
User clicks  →  controller handler in useActionQueueController
            →  optimistic local state update
            →  updateAccountInDb / bulkUpdateAccountsInDb     (Supabase write)
            →  safeLog(toast, persistFn, { type, account, ... })
            →  activityStore.log(...)                          (Cloud + local emit)
            →  ActivityLogPage re-renders via useActivityLog
            →  advanceToNextBestAccount()                      (where applicable)
            →  NextBestAccountModal opens
```

`safeLog` (in `features/activity-log/api/safeLog.tsx`) guarantees:

1. The user-facing action runs first.
2. The activity-log write only emits to subscribers if the store persists
   successfully.
3. On persist failure, a non-blocking warning toast offers retry — the
   underlying action is **never reverted**.

> **Known gap:** failed `updateAccountInDb` / `bulkUpdateAccountsInDb` calls
> currently leave local state diverged from the database. See
> `HANDOFF.md` → Known gaps → Data correctness.

### 6. Outreach modal — separated data layer

`OutreachModal` is presentation + local state only. The data side lives in:

- **`api/template.ts`** — `buildDefaultTemplate(account)` so the textarea is
  always pre-filled instantly.
- **`api/outreachApi.ts`** — `generateSuggestedMessage(account)` (simulated
  AI, ~15% failure) and `performSend()` (~30% failure).
  `GENERATION_TIMEOUT_MS = 2000` caps the loading state.

Generation is **always non-blocking**: the modal renders the default
template immediately, kicks off generation, and only swaps in the AI
suggestion if (a) it lands and (b) the user hasn't started typing.

### 7. Activity log — Cloud-backed pub/sub

`activityStore.ts`:

- `hydrate()` loads recent entries from the `activity_log` table on auth
  state change.
- `log(entry)` writes to Supabase, then notifies in-process subscribers.
- `useActivityLog` is a thin subscriber hook for `ActivityLogPage`.

RLS scopes visible entries to actions on the CSM's assigned accounts (or
untargeted entries the CSM created).

### 8. Resilience layer

| Surface                       | Where                                            | Behavior |
| ----------------------------- | ------------------------------------------------ | -------- |
| Global offline banner         | `shared/components/OfflineBanner.tsx`            | Watches `navigator.onLine`; persistent banner until reconnect. |
| Offline-safe sign-out         | `AuthProvider.signOut`                           | `scope: "local"` — clears tokens without a server round-trip. |
| Session-expiry toast          | `AuthProvider` `onAuthStateChange`               | One-shot warning when token refresh silently fails. |
| Structured fetch errors       | `useAccountsData` + `classifyError`              | Maps failures to offline / timeout / server / unknown with specific UI copy. |
| Login transport errors        | `LoginPage`                                      | Pre-flight `navigator.onLine` check; "Failed to fetch" mapped to friendly copy. |
| Action log retry              | `safeLog`                                        | Toast with retry on persistence failure; action stands. |

See `HANDOFF.md` → Known gaps → Resilience for what's still missing
(offline mutation queue, transport-aware OfflineBanner, cross-tab sign-out).

### 9. Analytics surface

`features/analytics/` renders a KPI row and CSM performance panel inline
above the Action Queue. Data flows from RLS-scoped reads (`useMetrics`,
`useSession`) so per-CSM scoping is preserved without any extra plumbing.

---

## Naming conventions

| Kind                 | Suffix / location                  | Example                                          |
| -------------------- | ---------------------------------- | ------------------------------------------------ |
| Route component      | `Page`, in `components/`           | `ActionQueuePage`, `LoginPage`                   |
| Modal                | `Modal`, in `components/`          | `OutreachModal`, `SnoozeModal`                   |
| Side panel           | `Panel`, in `components/`          | `AccountDetailPanel`                             |
| Row in a list        | `Row`, in `components/`            | `ActionQueueRow`                                 |
| Feature hook         | `useXxx.ts`, in `hooks/`           | `useAccountsData`, `useUserSettings`             |
| Pure logic           | descriptive `.ts`, in `api/`       | `queueLogic.ts`, `timeline.ts`                   |
| Network / store      | `*Api.ts` or `*Store.ts`, `api/`   | `outreachApi.ts`, `accountsApi.ts`, `activityStore.ts` |
| Type-only module     | `*Types.ts`, in `types/`           | `outcomeTypes.ts`                                |
| Cross-feature hook   | `useXxx.ts`, `shared/hooks/`       | `useInfiniteList`                                |
| Cross-feature comp.  | descriptive, `shared/components/`  | `AppLayout`, `OfflineBanner`                     |

---

## What is mocked vs real

| Real                                                              | Mocked / simulated                                |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| **Auth** — Supabase Auth (email + password), `AuthProvider`,      | **AI message generation** — `generateSuggested`-  |
| `ProtectedRoute`, `PublicOnlyRoute`, profiles auto-created via    | `Message` in `outreachApi.ts` (variable latency,  |
| Postgres trigger, default role `csm`.                             | ~15% failure). The 2 s timeout + fallback are     |
|                                                                   | real.                                             |
| **Accounts** — Cloud-backed via `accountsApi.ts`, RLS-scoped to   |                                                   |
| `assigned_csm_id = auth.uid()`. TanStack Query + 10 s timeout +   | **Outreach send** — `performSend()` (~30%         |
| structured error classification.                                  | failure). Updates DB state and writes to the      |
|                                                                   | activity log; no real email is dispatched.        |
| **Activity log** — Cloud-backed `activity_log` table, hydrated    |                                                   |
| on auth state change, RLS-scoped reads.                           | **Risk-level signals** — derived from seeded      |
|                                                                   | fields; no telemetry feed.                        |
| **Resilience** — global `OfflineBanner`, offline-safe sign-out,   |                                                   |
| session-expiry toast, structured fetch errors.                    | **User quotes** — hand-curated from churn         |
|                                                                   | research, attached to a subset of accounts.       |
| **Performance** — infinite scroll on Action Queue + Accounts.     |                                                   |
| **All UI flows, state transitions, empty / loading / error UI.**  |                                                   |
| **Seed data** — 4 demo CSMs (`seed-demo-csms` edge function) +    |                                                   |
| 300 unique accounts with realistic distributions.                 |                                                   |

The **two remaining seams** for going live:

1. `features/outreach/api/outreachApi.ts` — swap `generateSuggestedMessage`
   for a real AI Gateway call; swap `performSend` for a real email/CRM API.
   Keep `GENERATION_TIMEOUT_MS = 2000` so the UX guarantee survives.
2. (Telemetry-driven risk recomputation if/when product wires it.)

Auth, accounts, and activity log are already real — no swap needed.

---

## Adding a new feature

1. Create `src/features/<feature-name>/` with `components/`, and add
   `hooks/` and/or `api/` (and `types/`) only as needed.
2. Add the page or modal under `components/`. Move any non-trivial pure
   logic into `api/<descriptive>.ts`. Move data fetching / orchestration
   into `hooks/use<Feature>.ts`.
3. Add a barrel `index.ts` exporting the public surface (page, modal, the
   occasional hook).
4. If the feature is a route:
   - Register it in `src/App.tsx`, wrapped in `<ProtectedRoute>` (or
     `<PublicOnlyRoute>` if it's an auth-adjacent screen).
   - Add the nav item in `src/shared/components/AppSidebar.tsx`.
5. If the feature reads or writes data:
   - Use `supabase` from `@/integrations/supabase/client`.
   - Add an RLS policy on any new table — never trust the client to scope.
   - Prefer a TanStack Query hook over ad-hoc `useEffect` fetches.
6. Reuse `AppLayout`, `EmptyState`, `useInfiniteList`, and the `Account`
   types from `src/shared/`. Don't duplicate them.
7. Update `HANDOFF.md` if the feature introduces a new known gap.
