ALTER TABLE public.pubg_events
ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'variable' CHECK (reward_type IN ('fixed', 'variable')),
ADD COLUMN IF NOT EXISTS fixed_popularity integer NOT NULL DEFAULT 0 CHECK (fixed_popularity >= 0);