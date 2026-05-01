## Problem

After clicking the password reset link in the email, users land on `/reset-password` and get stuck on "Verifying your reset link…" — the page never advances to the new-password form.

## Root Cause

`ResetPasswordPage` only listens for `PASSWORD_RECOVERY` / `SIGNED_IN` events and calls `getSession()`. It doesn't handle the three possible URL formats Supabase returns from the recovery email:

1. **Hash-fragment session** (`#access_token=...&type=recovery`) — implicit flow. Auto-detected, but if the listener registers AFTER the SDK already processed the URL, the event was missed and the page only sees `getSession()` (which works) — usually fine.
2. **PKCE code** (`?code=...`) — default in Supabase JS v2. Requires `exchangeCodeForSession(code)`. Auto-exchange only works if the original `code_verifier` is in localStorage of the SAME browser that requested the reset. Cross-browser/incognito clicks fail silently — no session, no error shown.
3. **Error redirect** (`#error=access_denied&error_code=otp_expired&error_description=...` or `?error=...`) — expired/used links. Currently the page ignores these entirely and shows "Verifying…" forever.

There's also a race: the `onAuthStateChange` listener inside `ResetPasswordPage` is registered AFTER React mounts, but `AuthProvider` already registered its own listener at app boot and Supabase fires `PASSWORD_RECOVERY` during the initial URL parse. By the time the page mounts, the event has already fired — only the `getSession()` fallback can flip `ready`. If session-creation failed (case 2 or 3), the page never recovers.

## Fix

Rewrite `src/features/auth/components/ResetPasswordPage.tsx` to robustly handle all three cases on mount:

1. **Parse both `window.location.hash` AND `window.location.search`** for `error`, `error_code`, `error_description`, `code`, and `type=recovery`.
2. **If an error param is present**: show a friendly error state with a "Request a new reset link" button linking to `/forgot-password`. Stop trying to verify.
3. **If a `?code=...` param is present**: explicitly call `await supabase.auth.exchangeCodeForSession(code)`. If it fails, show the same error state. On success, clean the URL (`window.history.replaceState`) and proceed.
4. **Otherwise**: call `getSession()`. If a session exists → ready. If not → wait briefly for `PASSWORD_RECOVERY`/`SIGNED_IN` (with a ~3s timeout). If timeout elapses with no session, show the "link invalid or expired" error state.
5. After successful password update, **sign the user out** (`supabase.auth.signOut()`) before navigating, so they go through the normal login flow with their new password rather than being silently logged in via the recovery token. Navigate to `/login` with a success toast instead of `/`.

### Error state UI

Replace the static "Verifying your reset link…" with three clear states:
- `verifying` — spinner + "Verifying your reset link…"
- `ready` — the new-password form (unchanged)
- `invalid` — message: "This reset link is invalid or has expired." + "Request a new link" button → `/forgot-password`

### Files changed

- `src/features/auth/components/ResetPasswordPage.tsx` — only file modified.

No database, edge function, or AuthProvider changes needed.

## Why sign out after reset

Currently the recovery link silently establishes a real session, so after updating the password the user is dropped into the app already authenticated. That's confusing — and it means if a stranger clicked an intercepted reset link they'd be logged in without ever proving they know the new password. Forcing a fresh login after reset is the safer, clearer flow.
