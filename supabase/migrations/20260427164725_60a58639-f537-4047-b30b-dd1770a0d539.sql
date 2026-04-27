
-- =========================================================
-- 1. user_roles + has_role() (security-definer pattern)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 2. user_settings
-- =========================================================
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_alerts_high_risk boolean NOT NULL DEFAULT true,
  daily_digest boolean NOT NULL DEFAULT true,
  slack_notifications boolean NOT NULL DEFAULT false,
  risk_thresholds jsonb NOT NULL DEFAULT '{"high":{"min_inactive_days":2,"requires_no_invites":true},"medium":{"min_inactive_days":1}}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own settings"
  ON public.user_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own settings"
  ON public.user_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own settings"
  ON public.user_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own settings"
  ON public.user_settings FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. outreach_templates
-- =========================================================
CREATE TABLE public.outreach_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_templates_user ON public.outreach_templates(user_id);
CREATE UNIQUE INDEX idx_outreach_templates_one_default
  ON public.outreach_templates(user_id) WHERE is_default = true;

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own templates"
  ON public.outreach_templates FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own templates"
  ON public.outreach_templates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own templates"
  ON public.outreach_templates FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own templates"
  ON public.outreach_templates FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER outreach_templates_set_updated_at
  BEFORE UPDATE ON public.outreach_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: when is_default flips true, set all other rows for that user to false
CREATE OR REPLACE FUNCTION public.enforce_single_default_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.outreach_templates
      SET is_default = false
      WHERE user_id = NEW.user_id
        AND id <> NEW.id
        AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER outreach_templates_single_default
  AFTER INSERT OR UPDATE OF is_default ON public.outreach_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_template();

-- =========================================================
-- 4. benchmarks
-- =========================================================
CREATE TABLE public.benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value_pct numeric NOT NULL,
  comparator_pct numeric,
  copy_template text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  sample_size integer NOT NULL DEFAULT 0
);

ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read benchmarks"
  ON public.benchmarks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins insert benchmarks"
  ON public.benchmarks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update benchmarks"
  ON public.benchmarks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete benchmarks"
  ON public.benchmarks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed benchmark rows
INSERT INTO public.benchmarks (key, value_pct, comparator_pct, copy_template, sample_size) VALUES
  ('task_within_10min_retention_lift', 200, NULL,
   'Users who create a task within 10 minutes retain {value}% better.', 1240),
  ('no_activation_5day_churn', 82, NULL,
   'Users who don''t activate within 5 days churn at {value}%.', 980),
  ('invite_3day_rate', 12, NULL,
   'Only {value}% of users invite a teammate in the first 3 days.', 1500),
  ('invite_retention_compare', 68, 22,
   'Accounts with invites retain at {value}% vs {comparator}% without.', 1500)
ON CONFLICT (key) DO NOTHING;
