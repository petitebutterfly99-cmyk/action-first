## Goal
Make the password reset link reliably open the “create a new password” screen in the Lovable preview/published app, instead of sending the user back to the forgot-password resend flow.

## What I’ll change

1. **Make reset verification explicit on `/reset-password`**
   - Update `ResetPasswordPage.tsx` so it can directly consume the recovery URL hash when the user lands from the email link.
   - If the URL contains `access_token`, `refresh_token`, and `type=recovery`, call `supabase.auth.setSession(...)` immediately, instead of relying only on the global auth provider to detect the recovery session.
   - Keep support for PKCE links via `?code=...` using `exchangeCodeForSession(...)`.

2. **Prevent accidental “invalid link” redirects while auth is still settling**
   - Add a short, deterministic verification path: parse URL params first, perform any needed session setup, then show the password form when a reset session exists.
   - Avoid marking the link invalid just because the auth context has not updated yet.

3. **Keep `/reset-password` public and focused on password creation**
   - Do not route successful recovery sessions through `PublicOnlyRoute`, so authenticated recovery sessions are not bounced away before they can update their password.
   - Preserve the existing UI states: verifying, ready/new-password form, and invalid-link message.

4. **Improve post-reset cleanup**
   - After `updateUser({ password })` succeeds, sign out locally and navigate to `/login` with a success toast, so the user signs in again with their new password.
   - Clear recovery tokens from the address bar after the reset session is established.

5. **Update implementation notes**
   - Refresh `.lovable/plan.md` to reflect the corrected root cause and the new fix.

## Technical details

The current reset page depends primarily on `useAuth().session`. In practice, the recovery link can arrive with tokens in the URL hash, and the reset page may see `session === null` before the auth provider has settled. That causes the page to classify the link as invalid and show the “Request a new link” path.

The fix is to make the reset page self-sufficient for recovery URLs:

```ts
if (type === "recovery" && access_token && refresh_token) {
  await supabase.auth.setSession({ access_token, refresh_token });
  showNewPasswordForm();
}
```

This removes the race for implicit recovery links while keeping the auth provider as the normal app-wide session source once the session is established.

## Files to edit

- `src/features/auth/components/ResetPasswordPage.tsx`
- `.lovable/plan.md`

## Not changing

- No database changes.
- No backend function changes.
- No auth email template changes unless a separate issue is found later with the email link itself.