-- Events table for lightweight KPI tracking
CREATE TYPE public.event_type AS ENUM (
  'session_start',
  'action_committed',
  'outreach_send_attempt',
  'outreach_send_success',
  'outreach_send_failure',
  'outreach_retry',
  'ai_suggestion_used',
  'ai_suggestion_edited',
  'ai_suggestion_discarded',
  'filter_applied',
  'filter_zero_results',
  'next_account_prompt_shown',
  'next_account_accepted',
  'activity_log_write_failed'
);

CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NULL,
  event_type public.event_type NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user_created ON public.events (user_id, created_at DESC);
CREATE INDEX idx_events_user_type_created ON public.events (user_id, event_type, created_at DESC);
CREATE INDEX idx_events_account ON public.events (account_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read their own events"
  ON public.events FOR SELECT TO authenticated
  USING (user_id = auth.uid());