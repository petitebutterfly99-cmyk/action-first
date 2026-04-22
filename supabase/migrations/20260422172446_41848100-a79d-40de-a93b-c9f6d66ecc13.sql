-- Enums
CREATE TYPE public.risk_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.account_status AS ENUM ('needs_action', 'contacted', 'reviewed', 'snoozed', 'follow_up_needed');
CREATE TYPE public.activity_action_type AS ENUM ('send_outreach', 'prompt_invite', 'mark_reviewed', 'snooze', 'save_outcome', 'seed');

-- Accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  signup_date DATE NOT NULL,
  days_since_signup INTEGER NOT NULL DEFAULT 0,
  invites_sent INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  last_activity_days INTEGER NOT NULL DEFAULT 0,
  risk public.risk_level NOT NULL DEFAULT 'low',
  arr NUMERIC NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'Starter',
  status public.account_status NOT NULL DEFAULT 'needs_action',
  first_task_created BOOLEAN NOT NULL DEFAULT false,
  minutes_to_first_task INTEGER,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  quote_text TEXT,
  quote_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activity log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  type public.activity_action_type NOT NULL,
  account_name TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  user_label TEXT NOT NULL DEFAULT 'You',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX activity_log_created_at_idx ON public.activity_log (created_at DESC);
CREATE INDEX activity_log_account_id_idx ON public.activity_log (account_id);
CREATE INDEX accounts_status_idx ON public.accounts (status);
CREATE INDEX accounts_risk_idx ON public.accounts (risk);

-- updated_at trigger for accounts
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Permissive policies (prototype has no auth yet)
CREATE POLICY "Anyone can read accounts" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert accounts" ON public.accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update accounts" ON public.accounts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete accounts" ON public.accounts FOR DELETE USING (true);

CREATE POLICY "Anyone can read activity_log" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activity_log" ON public.activity_log FOR INSERT WITH CHECK (true);