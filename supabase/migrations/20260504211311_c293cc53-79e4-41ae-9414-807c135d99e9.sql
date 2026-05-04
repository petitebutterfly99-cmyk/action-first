
-- 1. Drop role column from profiles (authoritative source is user_roles)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Update handle_new_user to no longer write role to profiles, and to seed user_roles instead
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'csm'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. Activity log: add created_by_user_id, default to auth.uid(), tighten policies
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid DEFAULT auth.uid();

-- Drop and recreate policies to scope null-account rows to creator
DROP POLICY IF EXISTS "CSMs read activity for their accounts" ON public.activity_log;
DROP POLICY IF EXISTS "CSMs insert activity for their accounts" ON public.activity_log;

CREATE POLICY "CSMs read activity for their accounts"
ON public.activity_log
FOR SELECT
TO authenticated
USING (
  (account_id IS NULL AND created_by_user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = activity_log.account_id AND a.assigned_csm_id = auth.uid()
  )
);

CREATE POLICY "CSMs insert activity for their accounts"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  (created_by_user_id = auth.uid())
  AND (
    account_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = activity_log.account_id AND a.assigned_csm_id = auth.uid()
    )
  )
);
