I found the likely cause: the reset page is still relying on the global auth client’s normal URL auto-detection during app startup. That can consume and clear the recovery URL before `ResetPasswordPage` gets a chance to parse it, so the page may end up with no visible token/hash and cannot reliably move into the “Set a new password” state.

Plan:

1. Update the Lovable Cloud auth client initialization
   - Keep using the generated client file pattern, but add auth options so the SDK does not auto-consume recovery/OAuth parameters on initial app load:
     - `detectSessionInUrl: false`
     - keep `persistSession: true` and `autoRefreshToken: true`
   - This lets `ResetPasswordPage` be the single owner of password-recovery callback handling.

2. Harden `ResetPasswordPage`
   - Continue parsing both URL hash and query params.
   - Add support for all common recovery callback shapes:
     - implicit recovery tokens: `#access_token=...&refresh_token=...&type=recovery`
     - PKCE code: `?code=...`
     - token hash recovery links: `?token_hash=...&type=recovery`
     - explicit URL errors like expired or reused links.
   - For implicit tokens, call `setSession`.
   - For token-hash links, call `verifyOtp({ token_hash, type: "recovery" })`.
   - For PKCE links, call `exchangeCodeForSession(code)` when a verifier exists, and show a clear browser-specific message if not.
   - Only clear the URL hash/query after the recovery session is confirmed so we do not erase the link before it is usable.

3. Improve recovery-state handling in `AuthProvider`
   - Treat the `PASSWORD_RECOVERY` auth event as a valid authenticated session event, the same way `SIGNED_IN` is treated.
   - This prevents app-level auth state from looking unauthenticated while the reset form is trying to update the password.

4. Optional but helpful UI/debug improvements
   - If verification fails, show a clearer explanation and a “Request a new link” action.
   - Keep the existing behavior that signs the user out locally after successfully changing the password, then sends them back to `/login` to sign in with the new password.

5. Validate the flow
   - Check the app compiles via the automatic harness.
   - In the preview, request a reset link, open it, confirm the page shows the “New password” input, submit a valid non-breached password, and confirm it redirects back to login.

Files expected to change:
- `src/integrations/supabase/client.ts`
- `src/features/auth/components/ResetPasswordPage.tsx`
- `src/features/auth/components/AuthProvider.tsx`

Note: this is one of the rare cases where changing the generated auth client options is appropriate because the recovery page needs to own callback parsing. I will avoid changing the project URL, database schema, or any security policies.