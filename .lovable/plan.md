## Problem

After clicking the password reset link, the user lands on `/reset-password` but never sees the new-password form. Auth logs confirm the implicit flow succeeds (`/verify` returns 303, "Login" event fires with `login_method: "implicit"`), so a session IS being created — the page just doesn't recognize it.

## Root Cause

The recovery email link goes to Supabase's `/verify?token=...&type=recovery`, which 303-redirects back to `/reset-password` with `#access_token=...&refresh_token=...&type=recovery` in the URL hash.

When the page loads:

1. The Supabase JS client (initialized once at app boot inside `AuthProvider`) auto-parses the hash. `AuthProvider`'s `onAuthStateChange` listener — registered before the parse — receives the `PASSWORD_RECOVERY` event and updates its React state with the session.
2. `ResetPasswordPage` mounts AFTER this. Its own `onAuthStateChange` listener registers too late and never receives the initial `PASSWORD_RECOVERY` event (Supabase v2 does not replay it for late subscribers).
3. The page falls back to `await supabase.auth.getSession()`. This is a race: the SDK's internal hash-processing promise may or may not have written the session to storage yet. When it loses the race, `getSession()` returns `null`, the 4-second timeout fires, and the page shows "This reset link is invalid or has expired."
4. The user goes back to `/forgot-password` and requests another link, which gets rate-limited (429s in the log). Eventually they end up stuck on `/login`.

The current implementation duplicates auth-state tracking that `AuthProvider` already does correctly. The cleanest fix is to read the session straight from `AuthProvider`.

## Fix

Rewrite `src/features/auth/components/ResetPasswordPage.tsx` to consume the auth context instead of racing the SDK.

### Logic on mount

1. Parse `window.location.hash` and `window.location.search` for error params (`error`, `error_code`, `error_description`). If present → `invalid` state with the description (handles expired/used links cleanly).
2. Read `loading` and `session` from `useAuth()`.
   - While `loading` → stay in `verifying` state (don't time out).
   - Once `loading` is `false`:
     - If `session` exists → `ready`. Strip the URL hash so a refresh doesn't re-trigger anything.
     - If no session AND a PKCE `?code=...` is present → call `supabase.auth.exchangeCodeForSession(code)`. On success, the auth listener inside `AuthProvider` will pick up the new session and the effect re-runs → `ready`. On failure → `invalid` with a "open in same browser" hint.
     - If no session AND no code → `invalid` with "link expired" message.

This eliminates the race because `AuthProvider`'s listener was registered before any URL parsing happened, so it reliably catches the recovery session. The page just observes the result.

### Submit flow (unchanged behavior, kept intact)

- `supabase.auth.updateUser({ password })`.
- On success: `supabase.auth.signOut({ scope: "local" })` then navigate to `/login` with a success toast (forces a fresh login with the new password).

### UI states (unchanged)

- `verifying` — spinner + "Verifying your reset link…"
- `ready` — new-password form
- `invalid` — error message + "Request a new link" button → `/forgot-password`

### Files changed

- `src/features/auth/components/ResetPasswordPage.tsx` — only file modified.

No changes to `AuthProvider`, routing, database, or edge functions.

## Why this works

`AuthProvider` is mounted at the app root and its `onAuthStateChange` listener is registered before React renders any route. That listener is the one Supabase fires when the recovery hash is parsed, so `AuthProvider`'s `session` state is the source of truth. By subscribing to it via `useAuth()`, `ResetPasswordPage` no longer needs its own listener, no longer races `getSession()`, and no longer needs an arbitrary 4-second timeout.
