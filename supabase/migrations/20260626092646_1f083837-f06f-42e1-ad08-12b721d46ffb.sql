CREATE TABLE public.pubg_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pubg_events_name_not_blank CHECK (char_length(btrim(name)) > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pubg_events TO anon, authenticated;
GRANT ALL ON public.pubg_events TO service_role;

ALTER TABLE public.pubg_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events"
ON public.pubg_events
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create events"
ON public.pubg_events
FOR INSERT
TO anon, authenticated
WITH CHECK (char_length(btrim(name)) > 0);

CREATE POLICY "Anyone can update events"
ON public.pubg_events
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (char_length(btrim(name)) > 0);

CREATE POLICY "Anyone can delete events"
ON public.pubg_events
FOR DELETE
TO anon, authenticated
USING (true);

CREATE TABLE public.pubg_event_account_popularity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.pubg_events(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.pubg_accounts(id) ON DELETE CASCADE,
  kr_popularity INTEGER NOT NULL DEFAULT 0 CHECK (kr_popularity >= 0),
  global_popularity INTEGER NOT NULL DEFAULT 0 CHECK (global_popularity >= 0),
  spent_popularity INTEGER NOT NULL DEFAULT 0 CHECK (spent_popularity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pubg_event_account_popularity_unique UNIQUE (event_id, account_id),
  CONSTRAINT pubg_event_account_popularity_spent_cap CHECK (spent_popularity <= (kr_popularity + global_popularity))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pubg_event_account_popularity TO anon, authenticated;
GRANT ALL ON public.pubg_event_account_popularity TO service_role;

ALTER TABLE public.pubg_event_account_popularity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event popularity"
ON public.pubg_event_account_popularity
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create event popularity"
ON public.pubg_event_account_popularity
FOR INSERT
TO anon, authenticated
WITH CHECK (
  kr_popularity >= 0
  AND global_popularity >= 0
  AND spent_popularity >= 0
  AND spent_popularity <= (kr_popularity + global_popularity)
);

CREATE POLICY "Anyone can update event popularity"
ON public.pubg_event_account_popularity
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  kr_popularity >= 0
  AND global_popularity >= 0
  AND spent_popularity >= 0
  AND spent_popularity <= (kr_popularity + global_popularity)
);

CREATE POLICY "Anyone can delete event popularity"
ON public.pubg_event_account_popularity
FOR DELETE
TO anon, authenticated
USING (true);

CREATE INDEX pubg_event_account_popularity_event_id_idx
ON public.pubg_event_account_popularity (event_id);

CREATE INDEX pubg_event_account_popularity_account_id_idx
ON public.pubg_event_account_popularity (account_id);

CREATE TRIGGER set_pubg_events_updated_at
BEFORE UPDATE ON public.pubg_events
FOR EACH ROW
EXECUTE FUNCTION public.set_pubg_accounts_updated_at();

CREATE TRIGGER set_pubg_event_account_popularity_updated_at
BEFORE UPDATE ON public.pubg_event_account_popularity
FOR EACH ROW
EXECUTE FUNCTION public.set_pubg_accounts_updated_at();