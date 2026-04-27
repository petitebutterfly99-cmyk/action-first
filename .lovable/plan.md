# Rewrite HANDOFF.md "Known gaps before production"

Replace the existing "Known gaps before production" section in `HANDOFF.md` with a categorized, current-state audit that reflects the Cloud-backed auth, accounts, and activity-log integrations now in place.

## What changes

**File**: `HANDOFF.md` — single section replacement, no other content touched.

**Remove / rewrite (stale items)**:
- "No real auth, RBAC, or multi-user activity attribution" → rewritten as coarse-RBAC gap (Supabase auth + `profiles.role` now exist).
- "Activity log is per-browser (localStorage)" → reframed as a sync/dead-letter gap (store now hydrates from Cloud but retry handling is shallow).
- "No optimistic-update rollback on send failure" → kept but expanded to cover all `updateAccountInDb` / `bulkUpdateAccountsInDb` paths.
- "No pagination on the Accounts table" → reframed as silent 1000-row truncation in `fetchAccounts`.
- Settings risk-threshold gap → kept, restated to note `useUserSettings` persists but isn't consumed.

**New categorized gaps added**:
- **Data correctness**: optimistic rollback, 1000-row truncation, missing `AbortController`, no schema-version guard.
- **Auth & session**: no cross-tab sign-out, no expiry pre-warning, `signOut({ scope: "local" })` doesn't revoke server-side, app-layer rate limiting unverified.
- **Resilience**: `OfflineBanner` only watches `navigator.onLine` (misses Supabase-unreachable), no offline mutation queue, `activityStore` dead-letter handling.
- **Edge functions**: `seed-demo-csms` auth-gating to verify, no error-budget alerting.
- **Multi-user / realtime**: no `accounts` realtime subscription, no optimistic concurrency control.
- **Observability**: no client-side error reporting, analytics event coverage unaudited.
- **Testing**: only `ActionQueuePage.test.tsx` exists; no RLS / auth / error-path / bulk-op tests.
- **A11y / i18n**: unaudited.

**Structure**: grouped under sub-headings (Data correctness, Auth & session, Resilience, Multi-user/realtime, Observability, Business logic, Testing, A11y/i18n) so the next team can triage by category.

## Out of scope

- No code changes. Documentation only.
- No edits to `README.md`, `PRD.md`, `ARCHITECTURE.md`, or `Integration Plan.md` (they may also be stale, but the user asked specifically about HANDOFF.md).
- No new tests or implementation of any listed gap.
