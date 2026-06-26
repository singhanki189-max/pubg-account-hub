DROP POLICY IF EXISTS "Anyone can update events" ON public.pubg_events;
DROP POLICY IF EXISTS "Anyone can delete events" ON public.pubg_events;

CREATE POLICY "Anyone can update events"
ON public.pubg_events
FOR UPDATE
TO anon, authenticated
USING (char_length(btrim(name)) > 0)
WITH CHECK (char_length(btrim(name)) > 0);

CREATE POLICY "Anyone can delete events"
ON public.pubg_events
FOR DELETE
TO anon, authenticated
USING (char_length(btrim(name)) > 0);

DROP POLICY IF EXISTS "Anyone can update event popularity" ON public.pubg_event_account_popularity;
DROP POLICY IF EXISTS "Anyone can delete event popularity" ON public.pubg_event_account_popularity;

CREATE POLICY "Anyone can update event popularity"
ON public.pubg_event_account_popularity
FOR UPDATE
TO anon, authenticated
USING (
  kr_popularity >= 0
  AND global_popularity >= 0
  AND spent_popularity >= 0
  AND spent_popularity <= (kr_popularity + global_popularity)
)
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
USING (
  kr_popularity >= 0
  AND global_popularity >= 0
  AND spent_popularity >= 0
  AND spent_popularity <= (kr_popularity + global_popularity)
);