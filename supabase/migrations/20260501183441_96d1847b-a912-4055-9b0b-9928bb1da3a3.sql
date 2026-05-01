ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS show_guided_tour_buttons boolean NOT NULL DEFAULT true;