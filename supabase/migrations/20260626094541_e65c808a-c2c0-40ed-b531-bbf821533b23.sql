ALTER TABLE public.pubg_event_account_popularity
ADD COLUMN IF NOT EXISTS kr_spent_popularity integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS global_spent_popularity integer NOT NULL DEFAULT 0,
ADD CONSTRAINT pubg_event_account_popularity_kr_spent_non_negative CHECK (kr_spent_popularity >= 0),
ADD CONSTRAINT pubg_event_account_popularity_global_spent_non_negative CHECK (global_spent_popularity >= 0);