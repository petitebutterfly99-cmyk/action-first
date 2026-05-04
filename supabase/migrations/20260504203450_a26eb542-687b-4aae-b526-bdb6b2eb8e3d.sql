
-- Allow admins to view all accounts
CREATE POLICY "Admins view all accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Revoke direct EXECUTE on SECURITY DEFINER helpers from anon/authenticated.
-- They remain usable inside RLS policies and triggers (which run as the function owner).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_single_default_template() FROM anon, authenticated, public;
