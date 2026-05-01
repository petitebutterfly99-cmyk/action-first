## Goal
Apply the agreed security fixes and reflect them in the project docs.

## Changes

### 1. Enable Leaked Password Protection (HIBP)
Run `configure_auth` with `password_hibp_enabled: true` (other auth settings unchanged: signups enabled, email auto-confirm off, anonymous users off). New/changed passwords will be checked against the Have I Been Pwned database.

### 2. Revoke EXECUTE on trigger-only SECURITY DEFINER functions
Add a migration that revokes `EXECUTE` from `anon`, `authenticated`, and `public` on:
- `public.set_updated_at()`
- `public.handle_new_user()`
- `public.enforce_single_default_template()`

These functions only fire from triggers — clients never need to call them. This silences 4 of the 6 SECURITY DEFINER linter warnings without changing app behavior.

```sql
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_single_default_template() FROM anon, authenticated, public;
```

### 3. Document `has_role()` as accepted risk
- `public.has_role(uuid, app_role)` stays `SECURITY DEFINER` and EXECUTE-grantable to authenticated users. This is the recommended Lovable pattern for non-recursive RLS role checks; the function returns only a boolean.
- Mark the two remaining linter findings (`SUPA_anon_security_definer_function_executable` and `SUPA_authenticated_security_definer_function_executable` for `has_role`) as ignored with this rationale.
- Update the project security memory to record the accepted risk.

### 4. Update markdown docs (synced to GitHub via the GitHub integration)
Add a "Security posture" section to `HANDOFF.md` and a brief mention in `ARCHITECTURE.md` covering:
- RLS scoping summary (already partially documented).
- Roles live in `user_roles`, checked via `has_role()` (intentional `SECURITY DEFINER` exception).
- Trigger-only definer functions had public EXECUTE revoked.
- HIBP is enabled; auto-confirm email is off.
- Password reset flow takes ownership of the recovery hash via `setSession`.

Also note in `Integration Plan.md` that the `has_role()` SECURITY DEFINER usage is an accepted, documented exception.

### 5. Files touched
- `supabase/migrations/<timestamp>_revoke_trigger_function_execute.sql` (new)
- `HANDOFF.md` (append "Security posture" section before/after Accessibility section)
- `ARCHITECTURE.md` (short note in the auth/data flow area pointing to HANDOFF security section)
- `Integration Plan.md` (one-line clarification on the `has_role` exception)
- Security memory (already updated in this session — no further file change)

### 6. Not changing
- `has_role()` signature, body, or grants.
- Any RLS policy.
- Any client code.
- Auth providers/social login config.

## After approval
GitHub sync is bidirectional and automatic — once these edits land, they will appear on the connected GitHub repository without any manual push.