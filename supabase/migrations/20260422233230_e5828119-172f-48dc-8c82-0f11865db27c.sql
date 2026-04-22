-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('csm', 'admin');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'csm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'csm'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Account ownership
ALTER TABLE public.accounts
  ADD COLUMN assigned_csm_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX accounts_assigned_csm_id_idx ON public.accounts (assigned_csm_id);

-- 5. Replace permissive accounts policies with CSM-scoped ones
DROP POLICY IF EXISTS "Anyone can read accounts" ON public.accounts;
DROP POLICY IF EXISTS "Anyone can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Anyone can update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Anyone can delete accounts" ON public.accounts;

CREATE POLICY "CSMs view their assigned accounts"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (assigned_csm_id = auth.uid());

CREATE POLICY "CSMs insert accounts they own"
  ON public.accounts FOR INSERT
  TO authenticated
  WITH CHECK (assigned_csm_id = auth.uid());

CREATE POLICY "CSMs update their assigned accounts"
  ON public.accounts FOR UPDATE
  TO authenticated
  USING (assigned_csm_id = auth.uid());

CREATE POLICY "CSMs delete their assigned accounts"
  ON public.accounts FOR DELETE
  TO authenticated
  USING (assigned_csm_id = auth.uid());

-- 6. Activity log: scope to CSM
DROP POLICY IF EXISTS "Anyone can read activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Anyone can insert activity_log" ON public.activity_log;

CREATE POLICY "CSMs read activity for their accounts"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (
    account_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = activity_log.account_id
        AND a.assigned_csm_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users insert activity"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
