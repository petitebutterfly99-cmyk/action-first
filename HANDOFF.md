# RetainIQ — Engineering Handoff

This document is the bridge between the prototype and a production build. For the
product story see `README.md`; for the PRD see `PRD.md`; for folder/runtime
details see `ARCHITECTURE.md`.

---

## Start Here (new engineer, day one)

1. **Read in order**: `README.md` → `PRD.md` → `ARCHITECTURE.md` → this file.
2. **Run it**: `npm install && npm run dev`. Land on `/` (Action Queue) — it is
   the heart of the product. Everything else is supporting surface area.
3. **Trace one action end-to-end** before changing anything:
   - Click **Send Outreach** on a row in `ActionQueuePage`.
   - The handler calls `safeLog(...)` which runs the state update first, then
     writes to `activityStore`.
   - The row demotes (status → `contacted`), `NextBestAccountModal` opens.
   - Open `/activity` to see the entry appear (subscribed via `useActivityLog`).
4. **Find the seams**: three files contain everything you'd swap for a real
   backend — `shared/data/accounts/mockAccounts.ts`,
   `features/outreach/outreachApi.ts`,
   `features/activity-log/activityStore.ts`. The component tree does not need
   to change to go live.
5. **Where to start coding**:
   - Backend integration → start at the three seams above.
   - New action type → add to `ActivityActionType`, wire a handler in
     `ActionQueuePage`, log via `safeLog`.
   - New screen → new folder under `src/features/`, register route in
     `App.tsx`, add nav item in `AppSidebar.tsx`.
   - Visual change → tokens in `index.css` + `tailwind.config.ts`. Never
     hardcode colors in components.

---

## Component inventory

### Pages (route-level)

| Component            | Path                                              | Route        | Purpose |
| -------------------- | ------------------------------------------------- | ------------ | ------- |
| `ActionQueuePage`    | `features/action-queue/ActionQueuePage.tsx`       | `/`          | Primary screen. Owns account list state, all modal toggles, filter state, and the action-dispatch lifecycle. |
| `AccountsPage`       | `features/accounts/AccountsPage.tsx`              | `/accounts`  | Full account table view — read-only browse of all accounts. |
| `ActivityLogPage`    | `features/activity-log/ActivityLogPage.tsx`       | `/activity`  | Read-only audit trail. Subscribes to `activityStore` via `useActivityLog`. |
| `SettingsPage`       | `features/settings/SettingsPage.tsx`              | `/settings`  | Risk threshold configuration (UI only at this stage). |
| `NotFound`           | `pages/NotFound.tsx`                              | `*`          | 404 fallback. |

### Modals & panels

| Component                  | Path                                                | Purpose |
| -------------------------- | --------------------------------------------------- | ------- |
| `AccountDetailPanel`       | `features/account-detail/AccountDetailPanel.tsx`    | Side panel showing activation timeline + insights for one account. Pure presentation; data from `timeline.ts`. |
| `OutreachModal`            | `features/outreach/OutreachModal.tsx`               | Compose + send outreach. Opens with default template instantly; AI suggestion is a non-blocking enhancement. |
| `PromptInviteModal`        | `features/prompt-invite/PromptInviteModal.tsx`      | Suggests a low-friction invite-link message to copy + forward. |
| `OutcomeModal`             | `features/outcome/OutcomeModal.tsx`                 | Captured after a send to record outcome (replied, no response, meeting booked, etc.). Maps to a new account status. |
| `SnoozeModal`              | `features/snooze/SnoozeModal.tsx`                   | Defers an account by a chosen duration with optional reason. |
| `NextBestAccountModal`     | `features/next-best-account/NextBestAccountModal.tsx` | Surfaces the next high-priority account after an action to keep the CSM in flow. |

### Feature internals (sub-components & logic)

| File                                                 | Purpose |
| ---------------------------------------------------- | ------- |
| `features/action-queue/components/ActionQueueRow.tsx`| One row in the queue: badges, stats, insight, quote, status-aware CTAs. |
| `features/action-queue/queueLogic.ts`                | Pure: `selectQueue`, `computeRiskCounts`, `computeStatusCounts`, `pickNextBestCandidate`, label maps. |
| `features/account-detail/timeline.ts`                | Pure: `buildTimeline(account)`, `buildInsights(account)`. |
| `features/outreach/template.ts`                      | `buildDefaultTemplate(account)` — instant pre-fill, never blocks. |
| `features/outreach/outreachApi.ts`                   | Simulated AI generator + send. Variable latency, ~15% / ~30% failure. `GENERATION_TIMEOUT_MS = 2000`. |
| `features/outcome/outcomeTypes.ts`                   | Outcome enums + status mappings. |
| `features/snooze/snoozeOptions.ts`                   | Durations, reasons, `computeSnoozeUntil`. |
| `features/activity-log/activityStore.ts`             | In-memory + localStorage pub/sub store. Persists first, then updates listeners. |
| `features/activity-log/useActivityLog.ts`            | React hook subscribing to the store. |
| `features/activity-log/safeLog.tsx`                  | Action-first / log-second helper. Retry toast on persistence failure; never reverts the action. |

### Shared (cross-feature)

| Component / File                                | Purpose |
| ----------------------------------------------- | ------- |
| `shared/components/AppLayout.tsx`               | Sidebar + header + main chrome used by every page. |
| `shared/components/AppSidebar.tsx`              | Left nav with route highlighting and the "!" badge on Action Queue. |
| `shared/components/NavLink.tsx`                 | Thin `react-router` NavLink wrapper. |
| `shared/components/EmptyState.tsx`              | Generic empty-state for queue / log / accounts. |
| `shared/data/accounts/types.ts`                 | `Account`, `RiskLevel`, `AccountStatus` types. |
| `shared/data/accounts/mockAccounts.ts`          | `generateAccounts()`, `seedActivityLog`. |
| `shared/data/accounts/index.ts`                 | Barrel re-export. |

### Infrastructure / vendored

- `components/ui/*` — shadcn primitives. **Do not edit directly**; wrap with variants instead.
- `hooks/use-toast.ts`, `hooks/use-mobile.tsx` — app-wide hooks.
- `lib/utils.ts` — `cn()` class helper.
- `App.tsx` — router + global providers (`QueryClientProvider`, `TooltipProvider`, both `Toaster`s).
- `main.tsx` — Vite entry.
- `index.css` — design tokens (HSL semantic vars). All theming flows from here.
- `tailwind.config.ts` — Tailwind extension wired to the tokens.

---

## Data model

### `Account` (`shared/data/accounts/types.ts`)

```ts
type RiskLevel = "high" | "medium" | "low";

type AccountStatus =
  | "needs_action"
  | "contacted"
  | "reviewed"
  | "snoozed"
  | "follow_up_needed";

interface Account {
  id: string;
  name: string;
  daysSinceSignup: number;
  invitesSent: number;          // 0 = the activation gap the tool surfaces
  activeUsers: number;
  lastActivityDays: number;
  risk: RiskLevel;              // derived from invitesSent + lastActivityDays
  arr: number;
  plan: string;                 // Starter | Professional | Business | Enterprise
  status: AccountStatus;
  signupDate: string;
  firstTaskCreated: boolean;
  minutesToFirstTask: number | null;
  contactName: string;
  contactEmail: string;
  quote?: { text: string; source: string };
}
```

**Risk derivation** (in `mockAccounts.ts`, mirrors what a real backend should do):
- `high` — `invitesSent === 0 && lastActivityDays >= 2`
- `medium` — `invitesSent === 0 || lastActivityDays >= 2`
- `low` — otherwise

**Status lifecycle**:
```
needs_action ──Send Outreach──> contacted ──Outcome──> follow_up_needed | needs_action
needs_action ──Mark Reviewed──> reviewed
needs_action ──Snooze────────> snoozed   ──Resume──> needs_action
```

### `ActivityEntry` (`features/activity-log/activityStore.ts`)

```ts
type ActivityActionType =
  | "send_outreach"
  | "prompt_invite"
  | "mark_reviewed"
  | "snooze"
  | "save_outcome";

interface ActivityEntry {
  id: string;
  action: string;        // human label, e.g. "Sent outreach"
  type: ActivityActionType | "seed";
  account: string;
  accountId?: string;
  user: string;          // "You" in this prototype
  timestampISO: string;
  timestamp: string;     // human-readable
  note?: string;
}
```

Persistence: `localStorage["csm.activityLog.v1"]`. The store persists **before**
updating in-memory state, so subscribers never see a provisional entry that
might disappear on retry.

### Filter & queue state (in `ActionQueuePage`)

- `riskFilter: RiskLevel[]` — selected risk chips.
- `statusFilter: "all" | AccountStatus` — selected status chip.
- `selectedIds: Set<string>` — bulk-select state.
- Modal toggles: `outreachAccount`, `outcomeAccount`, `promptAccount`,
  `snoozeAccount`, `detailAccount`, `nextBestCandidate`.

All derivations (sort, filter, counts, next-best pick) go through
`queueLogic.ts` — never inlined.

---

## Mocked vs. real

| Real (UI / state / behavior)                        | Mocked (data layer — swap to go live)                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| All routing, components, sorting, filtering         | `mockAccounts.ts` — generates ~42 accounts on import (~12% have invited) |
| Bulk-select, status transitions, queue demotion     | `outreachApi.ts` — simulated AI generation (300–4500 ms latency, ~15% fail) |
| Outreach modal default template + non-blocking AI   | `outreachApi.ts` — simulated send (~30% fail) so retry/copy paths exist  |
| Activity store with localStorage persistence        | Next-best lookup latency + ~10% errors                                   |
| `safeLog` retry toast on persistence failure        | All "API" calls are in-process `setTimeout` Promises                     |
| `useActivityLog` hook + pub/sub                     | No real auth — `CURRENT_USER` is hard-coded `"You"`                      |
| Filter-aware account updates and toasts             | No real email send — outreach is logged but nothing is dispatched        |
| All loading / empty / error UI states               | Risk thresholds in Settings are UI-only (not yet wired to recompute risk) |

### Three seams to swap for production

1. **`shared/data/accounts/mockAccounts.ts`**
   Replace `generateAccounts()` with a fetch (TanStack Query is already
   provided). Keep the `Account` type contract intact and the rest of the app
   continues to work.
2. **`features/outreach/outreachApi.ts`**
   `generateSuggestedMessage` → real LLM call. `performSend` → real email/CRM
   API. Keep the `GENERATION_TIMEOUT_MS = 2000` cap so the UX guarantee
   (modal never blocks) survives.
3. **`features/activity-log/activityStore.ts`**
   Replace `load` / `persist` with backend reads/writes. Keep the
   "persist-then-emit" ordering — `safeLog` depends on it.

---

## Conventions cheat-sheet

- **Naming**: `*Page` for routes, `*Modal` for dialogs, `*Panel` for side panels, `*Row` for list items, `*Api.ts` for simulated APIs, descriptive `.ts` for pure logic.
- **Pure logic lives in `.ts` siblings** of the component that uses it. Components import — never inline sort/filter/template logic.
- **Colors**: HSL semantic tokens in `index.css` only. No hex / Tailwind color classes in components.
- **Actions**: always go through `safeLog` so the activity log and retry UX stay consistent.
- **shadcn primitives**: vendored under `components/ui/`. Wrap with variants; do not edit in place.

---

## Known gaps before production

Auth, accounts, and the activity log are now Cloud-backed, but the integration
surfaced a new class of gaps. Grouped by category so the next team can triage.

### Data correctness

- **No optimistic-update rollback.** `updateAccountInDb` and
  `bulkUpdateAccountsInDb` failures leave local state diverged from the
  database — a failed bulk update on 20 rows currently shows success in the UI.
  This also covers the original `safeLog` send-failure case: the `contacted`
  status sticks even when the send fails. Decide product behavior (revert vs.
  hold-and-retry) before wiring real send/CRM APIs.
- **Silent 1000-row truncation.** `fetchAccounts` has no `.range()` /
  pagination; Supabase's default 1000-row cap will silently drop accounts past
  the limit with no warning to the CSM. Fine for the demo seed (~42), latent
  data-correctness bug at scale.
- **No `AbortController` on in-flight requests.** Rapid filter changes,
  Retry clicks, and unmounts during a slow fetch race — stale responses can
  overwrite fresh ones in `useAccountsData`.
- **No schema-version / migration guard.** The client assumes columns like
  `outreach_count` and `last_outreach_sent_at` exist; a rolled-back migration
  crashes `rowToAccount` instead of degrading.

### Auth & session

- **RBAC is coarse.** `profiles.role` only distinguishes `csm` / `admin`. No
  per-account ACLs, team hierarchies, or delegated access.
- **No cross-tab sign-out propagation.** Signing out in one tab leaves other
  tabs authenticated until next refresh. Needs a `storage` event listener.
- **`signOut({ scope: "local" })` never revokes server-side sessions.** Stolen
  refresh tokens stay valid on the server. Acceptable for a prototype; must be
  hardened (server-scope sign-out with offline fallback) before production.
- **No session-expiry pre-warning.** Token-refresh failure surfaces a toast
  *after* the fact; long-idle CSMs lose unsaved modal state (outreach drafts,
  snooze reasons).
- **App-layer rate limiting unverified.** Login / password-reset rely entirely
  on Supabase defaults; no client-side throttling or lockout UX.

### Resilience & offline

- **`OfflineBanner` only watches `navigator.onLine`.** It misses the
  "online but Supabase unreachable" case (DNS, CORS, 5xx). The Action Queue's
  `classifyError` handles this locally, but the global banner doesn't, so other
  screens still show generic failures.
- **No offline mutation queue.** Sign-out works offline, but `Send Outreach`,
  `Snooze`, and `Mark Reviewed` simply fail with no replay when the connection
  returns.
- **`activityStore` dead-letter handling is shallow.** Persistence failures
  show a retry toast; if the user dismisses it, the entry is lost. The store
  hydrates from Cloud but has no reconciliation pass on reconnect.

### Multi-user / realtime

- **No realtime subscription on `accounts`.** Two CSMs working the same queue
  see stale data until manual refresh — one can `Send Outreach` to an account
  the other just snoozed.
- **No optimistic concurrency control.** No `updated_at` check or row version
  on writes; last write wins silently.

### Edge functions

- **`seed-demo-csms` auth-gating to verify** before production exposure.
- **No edge-function error budget or alerting.** Failures surface only in
  Supabase logs.

### Observability

- **No client-side error reporting** (Sentry or equivalent). The new structured
  errors in `useAccountsData` are user-facing only — engineers see nothing.
- **Analytics event coverage unaudited.** `analytics/eventsApi.ts` exists but
  the action-funnel vs. failure-event split has not been reviewed.

### Business logic

- **Settings risk thresholds are UI-only.** `useUserSettings` persists user
  preferences, but neither `accountsApi` nor any risk recomputation consumes
  them. Risk derivation still runs off the seed-data heuristic.

### Testing

- **Only `ActionQueuePage.test.tsx` exists.** No tests for auth flows,
  RLS-scoped fetches, error classification, offline banner, optimistic-update
  paths, or bulk operations.
- **No RLS policy tests.** Policies are trusted by inspection only.

### Accessibility & i18n

- **Both unaudited.** No keyboard-nav sweep, no screen-reader pass, no
  string externalization. Worth flagging now rather than discovering cold.

---

## Security posture (2026-05-01 audit)

- **RLS** enforces per-CSM scoping on `accounts`, `activity_log`,
  `outreach_templates`, `events`, `user_settings`, `profiles`. Admin-only
  writes on `benchmarks` and `user_roles` go through `has_role()`.
- **Roles** live in `user_roles` (never on `profiles`). Role checks use the
  `SECURITY DEFINER` function `public.has_role(uuid, app_role)` — required
  to avoid recursive RLS on `user_roles`. This is an intentional, accepted
  exception to the "no public security-definer" linter rule. The function
  returns only a boolean.
- **Trigger-only `SECURITY DEFINER` functions** (`set_updated_at`,
  `handle_new_user`, `enforce_single_default_template`) had `EXECUTE`
  revoked from `anon`/`authenticated`/`public` (migration
  `20260501_revoke_trigger_function_execute`). They run only via triggers
  and must never be called directly by clients.
- **Auth**: email/password sign-in. Email auto-confirm is OFF (users must
  verify before login). **Leaked password protection (HIBP) is ENABLED** —
  passwords are checked against the Have I Been Pwned database on signup
  and password change.
- **Password reset** (`/reset-password`) takes ownership of the recovery
  URL hash by calling `supabase.auth.setSession(...)` directly to avoid a
  race with the global `AuthProvider` listener. PKCE recovery links are
  handled via `exchangeCodeForSession`.

See the project security memory for the canonical list of accepted risks.
