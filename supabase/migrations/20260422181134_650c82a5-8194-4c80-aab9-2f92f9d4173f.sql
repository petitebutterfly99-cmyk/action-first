
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS last_outreach_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outreach_sent_by text,
  ADD COLUMN IF NOT EXISTS outreach_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS accounts_last_outreach_sent_at_idx
  ON public.accounts (last_outreach_sent_at);
