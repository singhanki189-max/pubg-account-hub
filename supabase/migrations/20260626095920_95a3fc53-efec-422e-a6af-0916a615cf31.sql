ALTER TABLE public.pubg_events
ADD COLUMN mode text NOT NULL DEFAULT 'kr';

ALTER TABLE public.pubg_events
ADD CONSTRAINT pubg_events_mode_check CHECK (mode IN ('kr', 'global'));

CREATE INDEX IF NOT EXISTS pubg_events_mode_created_at_idx
ON public.pubg_events (mode, created_at DESC);