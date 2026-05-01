# RetainIQ — Integration Plan

A pre-integration audit of the current prototype, prepared as the bridge between M4 (UI prototype) and M5 (production wiring).

---

## Section 1 — M4 Status Check

| Item | Status | Evidence |
|---|---|---|
| Number of screens | **9** | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/` (Action Queue), `/accounts`, `/activity`, `/settings`, `*` (NotFound) — see `src/App.tsx` |
| Living PRD / product requirements doc | ✅ **Yes** | `PRD.md`, `README.md`, `ARCHITECTURE.md`, `HANDOFF.md`, `README_M3_END.md` all present at project root |
| Clean, descriptive variable & function names | ✅ **Yes** | Feature-sliced folders (`src/features/<domain>/{components,hooks,api,types}`), named hooks (`useActionQueueController`, `useNextBestAccount`, `useBulkSelection`), pure helpers (`buildTimeline`, `computeSnoozeUntil`) |
| GitHub connected | ⚠️ **Not verified from inside the sandbox** — connect via Lovable → GitHub if not already linked |
| Supabase / database backend connected | ✅ **Yes (Lovable Cloud)** | Tables `accounts`, `activity_log`, `events`, `profiles` live with RLS; client wired at `src/integrations/supabase/client.ts`; auth via `AuthProvider` |

---

## Section 2 — Data Audit: What's Still Hardcoded?

| Screen / Component | Hardcoded Value | What It Should Query |
|---|---|---|
| `AccountDetailPanel.tsx` (line 161-162) | "Users who create a task within 10 minutes retain 2x more." / "...churn at 82%." | New `benchmarks` table OR computed aggregate over `accounts` (e.g. `AVG(retained) WHERE minutes_to_first_task < 10`) |
| `AccountDetailPanel.tsx` (line 165-167) | "Only 12% of users invite a teammate in the first 3 days. Accounts with invites retain at 68% vs 22% without." | Aggregate query on `accounts`: `COUNT(*) FILTER (WHERE invites_sent > 0 AND days_since_signup <= 3) / COUNT(*)` |
| `SettingsPage.tsx` (lines 15, 19, 23) | `<Switch defaultChecked />` for "Email alerts", "Daily digest", "Slack notifications" — purely cosmetic | New `user_settings` table keyed by `user_id` with boolean prefs |
| `SettingsPage.tsx` (lines 29-31) | Risk threshold copy ("High Risk: No invites + no activity for 2+ days", etc.) | New `risk_rules` table OR `user_settings.risk_thresholds jsonb` so CSMs can tune per portfolio |
| `outreachApi.ts` → `generateSuggestedMessage` | Hardcoded template `"Hey {first} — most teams see value once they invite a teammate..."` and simulated 300–4500ms latency + 15% failure | Lovable AI edge function call (`google/gemini-2.5-flash`) using account context |
| `outreachApi.ts` → `performSend` | Simulated `setTimeout(1200ms)` + 30% random failure | Real email provider edge function (Resend/SendGrid) |
| `template.ts` → `buildDefaultTemplate` | Static fallback string | Pull last successful template per CSM from `events` (event_type `outreach_send_success`) |
| `timeline.ts` → `buildTimeline` | Synthesized "Day 0", "Day 1" labels derived from account fields, not real events | Query `activity_log` filtered by `account_id` for actual event timestamps |
| `useNextBestAccount.ts` → `riskReason` (in NBA modal) | Reason strings derived from current account row only | Query `events` for prior CSM interactions to avoid re-prompting same account |
| `mockAccounts.ts` (re-exported via `shared/data/accounts/index.ts`) | `mockAccounts`, `seedActivityLog` — dead code, not consumed by app | **Delete** — `accountsApi.fetchAccounts()` is the live path |
| `AppSidebar.tsx` / header | Static nav labels (Action Queue, Accounts, Activity, Settings) — these are intentional | No change |
| `KpiRow.tsx` / `CsmPerformancePanel.tsx` | ✅ Already live — driven by `useMetrics` polling `events` table | No change |

---

## Section 3 — Schema Design

### Existing Tables (from M4)

**`profiles`** — *existing*
| Field | Type | Purpose |
|---|---|---|
| id | uuid (PK, = auth.users.id) | User identity |
| full_name | text | Display name in header |
| email | text | Contact |
| role | enum `app_role` (`csm`, `admin`) | Authorization |
| created_at, updated_at | timestamptz | Audit |

**`accounts`** — *existing*
| Field | Type | Purpose |
|---|---|---|
| id | uuid (PK) | — |
| name | text | Account name shown in queue |
| assigned_csm_id | uuid → profiles.id | Per-CSM scoping (RLS key) |
| status | enum `account_status` | Queue state |
| risk | enum `risk_level` | Sort priority |
| signup_date | date | Lifecycle anchor |
| days_since_signup, last_activity_days | int | Risk math |
| invites_sent, active_users | int | Activation signals |
| first_task_created | bool | Activation signal |
| minutes_to_first_task | int | Time-to-value |
| arr | numeric | Revenue weighting |
| plan | text | Plan tier |
| contact_name, contact_email | text | Outreach target |
| quote_text, quote_source | text | Customer voice in detail panel |
| last_outreach_sent_at | timestamptz | Cooldown logic |
| last_outreach_sent_by | text | Attribution |
| outreach_count | int | Volume cap |

**`activity_log`** — *existing*
| Field | Type | Purpose |
|---|---|---|
| id | uuid | — |
| account_id | uuid → accounts.id | Scope |
| account_name | text | Denormalized for fast log render |
| action | text | Human-readable label |
| type | enum `activity_action_type` | Filter/group |
| user_label | text | "You" or CSM name |
| note | text | Free-form context |
| created_at | timestamptz | Log order |

**`events`** — *existing*
| Field | Type | Purpose |
|---|---|---|
| id | uuid | — |
| user_id | uuid | RLS owner |
| account_id | uuid (nullable) | Optional scope |
| event_type | enum `event_type` | 14 typed events |
| metadata | jsonb | Flexible payload |
| created_at | timestamptz | Time-series analytics |

### New Tables (proposed)

**`user_settings`** — *new* (replaces hardcoded Settings toggles)
| Field | Type | Purpose |
|---|---|---|
| user_id | uuid (PK → profiles.id) | One row per CSM |
| email_alerts_high_risk | bool | Notification pref |
| daily_digest | bool | Notification pref |
| slack_notifications | bool | Notification pref |
| risk_thresholds | jsonb | Tunable rule set, e.g. `{"high":{"min_inactive_days":2,"requires_no_invites":true}}` |
| updated_at | timestamptz | Audit |

**`benchmarks`** — *new* (replaces hardcoded retention/activation copy in AccountDetailPanel)
| Field | Type | Purpose |
|---|---|---|
| id | uuid | — |
| key | text (unique) | e.g. `task_within_10min_retention_lift`, `invite_3day_rate` |
| value_pct | numeric | Stat shown in UI |
| comparator_pct | numeric (nullable) | "vs X%" companion stat |
| copy_template | text | Sentence with `{value}` / `{comparator}` placeholders |
| computed_at | timestamptz | Freshness |
| sample_size | int | Stat credibility |

**`outreach_templates`** — *new* (replaces hardcoded `buildDefaultTemplate`)
| Field | Type | Purpose |
|---|---|---|
| id | uuid | — |
| user_id | uuid → profiles.id | Per-CSM templates (RLS) |
| label | text | "Invite nudge", "Renewal check-in" |
| body | text | Template body with `{first_name}` placeholders |
| is_default | bool | Picked when AI generation fails |
| created_at, updated_at | timestamptz | Audit |

---

## Section 4 — Auth Model & Permissions

### Roles

Already defined as enum `app_role`: **`csm`** and **`admin`**.

| Role | Can see | Can do |
|---|---|---|
| **csm** (default) | Only accounts where `assigned_csm_id = auth.uid()`; their own activity log entries; their own events; their own settings/templates | Create/update/delete their accounts; log activities on their accounts; record events; edit their settings & templates |
| **admin** *(future)* | All accounts across CSMs; aggregated event analytics; benchmarks management | Reassign accounts between CSMs; edit `benchmarks` table; view org-wide CSM Performance roll-ups |

### Row-Level Security Rules

| Table | Policy | Rationale |
|---|---|---|
| `accounts` | ✅ live: `assigned_csm_id = auth.uid()` for SELECT/UPDATE/INSERT/DELETE | CSMs only see their portfolio |
| `activity_log` | ✅ live: row's `account_id` must belong to a row whose `assigned_csm_id = auth.uid()` | Cross-CSM activity is private |
| `events` | ✅ live: `user_id = auth.uid()` (owner only) | Per-CSM analytics, no leakage |
| `profiles` | ✅ live: `auth.uid() = id` for self-read/update | No directory exposure |
| **`user_settings`** *(new)* | `user_id = auth.uid()` for all operations | Personal prefs |
| **`outreach_templates`** *(new)* | `user_id = auth.uid()` for all operations | Templates are personal IP |
| **`benchmarks`** *(new)* | SELECT: `true` (public read for authenticated users); INSERT/UPDATE/DELETE: `has_role(auth.uid(), 'admin')` via security-definer function | Stats are shared but only admins curate |

Admin elevation requires the standard `user_roles` + `has_role()` pattern (security-definer function) — **never** check role from the client. The `SECURITY DEFINER` grant on `public.has_role` is an intentional, documented exception to the "no public security-definer functions" linter rule (required to avoid recursive RLS on `user_roles`); see `HANDOFF.md` → "Security posture".

---

## Section 5 — Prompts

### Prompt 1 — Schema Expansion

```
Extend the RetainIQ database and replace hardcoded UI values with real queries.

1. Create three new tables with RLS:

   a) user_settings (one row per CSM, PK = user_id → profiles.id)
      - email_alerts_high_risk bool default true
      - daily_digest bool default true
      - slack_notifications bool default false
      - risk_thresholds jsonb default '{"high":{"min_inactive_days":2,"requires_no_invites":true},"medium":{"min_inactive_days":1}}'
      - updated_at timestamptz default now()
      - RLS: user_id = auth.uid() for all ops

   b) outreach_templates
      - id uuid pk, user_id uuid, label text, body text,
        is_default bool default false, created_at, updated_at
      - RLS: user_id = auth.uid() for all ops
      - Trigger: when is_default flips true, set all other rows for that user to false

   c) benchmarks
      - id uuid pk, key text unique, value_pct numeric,
        comparator_pct numeric, copy_template text,
        computed_at timestamptz, sample_size int
      - RLS: SELECT for authenticated, write only for admins via has_role()
      - Seed three rows with keys: 'task_within_10min_retention_lift',
        'invite_3day_rate', 'invite_retention_compare'

2. Replace hardcoded UI values:
   - In src/features/account-detail/components/AccountDetailPanel.tsx (lines 158-168):
     replace the static "82% churn" / "12% invite" / "68% vs 22%" copy with values
     fetched from the benchmarks table via a new hook useBenchmarks() in
     src/features/account-detail/hooks/.
   - In src/features/settings/components/SettingsPage.tsx: replace the three
     <Switch defaultChecked /> with controlled switches bound to a useUserSettings()
     hook that reads/writes user_settings; add an upsert on toggle.
   - In src/features/outreach/api/template.ts: change buildDefaultTemplate to load
     the user's is_default outreach_templates row, falling back to the current
     hardcoded string only if none exists.

3. Delete the dead exports in src/shared/data/accounts/index.ts:
   remove `mockAccounts` and `seedActivityLog` exports and the file mockAccounts.ts.

Add proper loading + error handling on each new query.
```

### Prompt 2 — Auth UI + Row-Level Security

```
Auth is already wired (AuthProvider, ProtectedRoute, login/signup/forgot/reset pages,
profiles table with RLS). Polish and verify it end-to-end.

1. Header + logout
   - In src/shared/components/AppLayout.tsx (or AppSidebar.tsx) show the logged-in
     user's full_name and email, sourced from useAuth().profile.
   - Add a Logout button that calls useAuth().signOut() and routes to /login.

2. Verify RLS isolation
   - Confirm two seeded CSMs see disjoint accounts on / (Action Queue) and /accounts.
   - Confirm /activity only shows entries for accounts the current user owns.
   - Confirm /settings only loads/saves the current user's user_settings row.
   - Confirm CSM Performance KPIs (KpiRow + CsmPerformancePanel) only count the
     current user's events (events.user_id = auth.uid()).

3. Add admin role plumbing (no admin UI yet)
   - Create user_roles table + has_role(uuid, app_role) security-definer function
     following the project's user-roles pattern. Migrate the existing role column
     on profiles to be display-only; treat user_roles as the source of truth for
     authorization. Update the benchmarks RLS write policy to use has_role().

4. Session UX
   - On 401/expired session from any Supabase call, redirect to /login with a
     toast "Your session expired — please sign in again."
```

### Prompt 3 — Edge Cases

```
Harden the entire app against the five core failure modes. Apply consistently.

1. Database connection failure
   - Wrap every fetch in src/features/*/api/*.ts and src/shared/data/accounts/accountsApi.ts
     with try/catch. On failure, surface an inline error card with a Retry button
     (re-runs the query). Never show a blank screen.
   - Use the existing <EmptyState /> component (src/shared/components/EmptyState.tsx)
     pattern for consistency.

2. Empty data states
   - Action Queue (/) when zero accounts: "No accounts in your queue yet" + CTA to
     /accounts.
   - Accounts (/accounts) when zero rows: "No assigned accounts" + contact-admin hint.
   - Activity Log (/activity) when zero entries: "No activity yet — your actions
     from the queue will appear here."
   - CSM Performance panel when metrics null: keep the existing "—" placeholders
     (already implemented) but add a subtitle "Take an action to populate metrics."

3. Form submission failure
   - OutreachModal: on performSend() reject, show inline error above the Send
     button, preserve the message draft in state, expose Retry. (Partially done
     via outreach_retry event — verify draft preservation.)
   - SnoozeModal, PromptInviteModal, OutcomeModal: same pattern — never close
     the modal on error; preserve all field values.
   - Login/Signup forms: show inline field errors, keep email value populated.

4. Loading states (skeletons)
   - Replace every "Loading…" string with <Skeleton /> from
     src/components/ui/skeleton.tsx:
     - ActionQueuePage rows: 8 skeleton rows while accounts load
     - AccountDetailPanel: skeleton timeline + stats while opening
     - ActivityLogPage: 10 skeleton rows
     - KpiRow + CsmPerformancePanel: skeleton tiles before first metrics tick

5. Session expiry
   - In src/integrations/supabase/client.ts is auto-generated; instead, add a
     global response interceptor inside AuthProvider via supabase.auth.onAuthStateChange:
     when event === 'TOKEN_REFRESHED' fails or session becomes null mid-app,
     navigate('/login') and toast "Session expired. Please sign in again."

Add a vitest covering at least the empty-state and retry behavior on the
Action Queue.
```

---

## Section 6 — Edge Case Checklist

- [ ] **DB connection failure** — Every screen renders an error card with a Retry button instead of a blank state.
- [ ] **Empty data state** — `/`, `/accounts`, `/activity` show product-specific empty states with a next-step CTA.
- [ ] **Form submission failure** — `OutreachModal`, `SnoozeModal`, `PromptInviteModal`, `OutcomeModal` keep their fields populated and show inline retry on failure.
- [ ] **Loading state (skeletons)** — Skeletons render on every fetching surface (queue rows, detail panel timeline, activity log, KPI row).
- [ ] **Session expiry** — Expired tokens redirect to `/login` with an explanatory toast.
- [ ] **Cross-CSM data leak** — Switching demo CSM accounts shows entirely disjoint accounts/activity/events.
- [ ] **Outreach send failure with retry** — Real send errors reuse the existing `outreach_retry` event and preserve the AI-edited draft.
- [ ] **AI generation timeout (>2s)** — Falls back to `buildDefaultTemplate` without blocking the modal (already partially in place).
- [ ] **Stale account in queue** — If status changed by another tab, refresh row before allowing an action commit.
- [ ] **Snooze in the past** — Disable Snooze button when `computeSnoozeUntil()` would be < now.
- [ ] **Duplicate outreach** — Disable Send when `last_outreach_sent_at` < 24h unless CSM explicitly overrides.
- [ ] **Bulk action partial failure** — `useBulkSelection` flow reports per-row success/failure; failed rows stay selected.
- [ ] **Next-Best-Account exhaustion** — Modal shows the "no more" state with risk-switch CTA (already wired via `mode='done'`).
- [ ] **URL focus on missing account** — `useFocusFromUrl` gracefully clears the param when the ID isn't in the user's portfolio.
- [ ] **Activity log write failure** — Already emits `activity_log_write_failed` event; surface a non-blocking toast.
- [ ] **Keyboard accessibility** — Modal focus trap + Escape close on every dialog.

---

## Section 7 — Stress Test Plan

### Test 1 — Connection Failure Mid-Action ("Offline Outreach")
**Setup:** Sign in as a seeded CSM, open the Action Queue, click an account, open the Outreach modal, write a custom message.
**Action:** Open browser DevTools → Network → set to **Offline**. Click **Send Outreach**.
**Expected:**
- Send fails within ~1.2s with an inline error above the Send button.
- The draft message text remains in the textarea (not cleared).
- A **Retry** affordance appears.
- An `outreach_send_failure` event still queues locally (or a `activity_log_write_failed` event fires when it can't reach Supabase).
- Restoring network and clicking Retry succeeds and emits `outreach_send_success`.

### Test 2 — Fresh User / Zero Data ("First Login")
**Setup:** Sign up a brand-new CSM account at `/signup` (do **not** seed accounts to them).
**Action:** Land on `/` (Action Queue). Visit `/accounts`, `/activity`, `/settings`, and open the CSM Performance panel.
**Expected:**
- Action Queue shows an empty state: "No accounts in your queue yet" with a CTA, **not** a blank table.
- Accounts page shows a contact-admin hint.
- Activity Log shows "No activity yet — actions from the queue will appear here."
- KPI Row shows `0` / `—` placeholders without crashing; CSM Performance subtitle reads "Take an action to populate metrics."
- Settings page loads default toggles, and toggling persists to a new `user_settings` row.
- A `session_start` event is recorded for the new user.

### Test 3 — Rapid Repeated Actions ("Spam-Click Send")
**Setup:** Sign in as a seeded CSM, open Outreach modal on a high-risk account.
**Action:** Click **Send Outreach** ten times in rapid succession (sub-second). Then immediately click **Snooze** on three different rows in the queue back-to-back.
**Expected:**
- Send button disables after first click; only **one** `outreach_send_attempt` and **one** `outreach_send_success` (or `_failure`) event is recorded — no duplicates.
- `outreach_count` on the account increments by exactly 1.
- Snooze actions process sequentially without the optimistic UI showing a row twice or losing a click.
- No duplicate rows appear in `activity_log` for the same account/timestamp.
- KPI Row's `actionsCommitted` increments by exactly the count of distinct successful actions.

---

## Section 8 — Handoff Note

### What's Real vs. What's Mocked

| Feature | Status | Notes |
|---|---|---|
| Auth (signup/login/reset) | ✅ Real | Supabase Auth + `profiles` row via `handle_new_user()` trigger |
| Account list & per-CSM scoping | ✅ Real | `accounts` table, RLS by `assigned_csm_id` |
| Action Queue ranking | ✅ Real | `queueLogic.ts` over live `accounts` |
| Account Detail timeline | 🟡 Mixed | Built from real `accounts` fields; benchmark copy is hardcoded |
| Outreach modal — AI suggestion | ❌ Mocked | `generateSuggestedMessage` is a stub with random latency/failure |
| Outreach modal — Send | ❌ Mocked | `performSend` is a stub with 30% random failure |
| Snooze / Prompt Invite / Mark Reviewed / Outcome | ✅ Real | Persist to `accounts.status` + `activity_log` |
| Activity Log page | ✅ Real | `activity_log` table, RLS by account ownership |
| Analytics — events | ✅ Real | `events` table, polled every 4s by `useMetrics` |
| KPI Row + CSM Performance panel | ✅ Real | Live aggregates from `events` |
| Settings page | ❌ Cosmetic | Switches don't persist anywhere |
| Risk thresholds copy | ❌ Hardcoded | Static text in `SettingsPage` |
| Next-Best-Account flow | ✅ Real | Real account selection, real events |

### Database Schema Summary

- **`profiles`** — one row per authenticated user; identity + display name + role.
- **`accounts`** — CSM-owned customer accounts with risk, ARR, activation signals, outreach metadata.
- **`activity_log`** — append-only audit trail of CSM actions per account.
- **`events`** — typed product analytics events scoped to the acting user.
- *(planned)* **`user_settings`** — per-CSM notification & threshold preferences.
- *(planned)* **`outreach_templates`** — per-CSM message templates with one default.
- *(planned)* **`benchmarks`** — shared, admin-curated retention/activation stats.

### Auth & RLS Model

- **Roles:** `csm` (default), `admin` — stored in the dedicated `user_roles` table (never on `profiles`) and checked via the `has_role(uuid, app_role)` SECURITY DEFINER function. The `SECURITY DEFINER` grant on `public.has_role` is an intentional, documented exception to the "no public security-definer functions" linter rule (required to avoid recursive RLS on `user_roles`); see `HANDOFF.md` → "Security posture".
- **Visibility:** A CSM only sees rows in `accounts`, `activity_log`, `events`, `profiles`, `user_settings`, `outreach_templates` that belong to them.
- **Benchmarks** are readable by all authenticated users, writable only by admins (via `has_role()`).
- **No client-side role checks** — all enforcement is in Postgres RLS + the `has_role()` security-definer function.
- **Trigger-only SECURITY DEFINER functions** (`set_updated_at`, `handle_new_user`, `enforce_single_default_template`) had `EXECUTE` revoked from `anon`/`authenticated`/`public` (migration `20260501_revoke_trigger_function_execute`). They run only via triggers and must never be called directly by clients.
- **Leaked password protection (HIBP) is enabled** at the auth layer; email auto-confirm is off.
- **Password reset** (`/reset-password`) takes ownership of the recovery URL hash via `setSession` / `exchangeCodeForSession` to avoid a race with the global `AuthProvider` listener (previously caused users to be bounced back to "request a new link").

### Edge Cases Handled
*(to be filled in after the integration lab)*

### Known Gaps
*(to be filled in after stress testing)*

### Live URL
*(to be filled in after deployment)*
