CREATE TABLE public.pubg_sales_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  gmail text NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('sale', 'earning')),
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0),
  note text NOT NULL DEFAULT '',
  sold_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pubg_sales_entries TO authenticated;
GRANT ALL ON public.pubg_sales_entries TO service_role;
ALTER TABLE public.pubg_sales_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sales entries"
ON public.pubg_sales_entries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sales entries"
ON public.pubg_sales_entries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sales entries"
ON public.pubg_sales_entries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sales entries"
ON public.pubg_sales_entries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
CREATE TRIGGER set_pubg_sales_entries_updated_at
BEFORE UPDATE ON public.pubg_sales_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_pubg_accounts_updated_at();

REVOKE ALL ON public.pubg_accounts FROM anon;
REVOKE ALL ON public.pubg_events FROM anon;
REVOKE ALL ON public.pubg_event_account_popularity FROM anon;

DROP POLICY IF EXISTS "Anyone can view pubg accounts" ON public.pubg_accounts;
DROP POLICY IF EXISTS "Create pubg accounts with valid values" ON public.pubg_accounts;
DROP POLICY IF EXISTS "Update pubg accounts with valid values" ON public.pubg_accounts;
DROP POLICY IF EXISTS "Delete pubg accounts with valid rows" ON public.pubg_accounts;
CREATE POLICY "Authenticated can view pubg accounts"
ON public.pubg_accounts
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Authenticated can create pubg accounts with valid values"
ON public.pubg_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  (gmail ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)
  AND (uc >= 0)
  AND (cards >= 0)
  AND (mix_pop >= 0)
);
CREATE POLICY "Authenticated can update pubg accounts with valid values"
ON public.pubg_accounts
FOR UPDATE
TO authenticated
USING (
  (gmail ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)
  AND (uc >= 0)
  AND (cards >= 0)
  AND (mix_pop >= 0)
)
WITH CHECK (
  (gmail ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)
  AND (uc >= 0)
  AND (cards >= 0)
  AND (mix_pop >= 0)
);
CREATE POLICY "Authenticated can delete pubg accounts with valid rows"
ON public.pubg_accounts
FOR DELETE
TO authenticated
USING (
  (gmail ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)
  AND (uc >= 0)
  AND (cards >= 0)
  AND (mix_pop >= 0)
);

DROP POLICY IF EXISTS "Anyone can view events" ON public.pubg_events;
DROP POLICY IF EXISTS "Anyone can create events" ON public.pubg_events;
DROP POLICY IF EXISTS "Anyone can update events" ON public.pubg_events;
DROP POLICY IF EXISTS "Anyone can delete events" ON public.pubg_events;
CREATE POLICY "Authenticated can view events"
ON public.pubg_events
FOR SELECT
TO authenticated
USING (char_length(btrim(name)) > 0);
CREATE POLICY "Authenticated can create events"
ON public.pubg_events
FOR INSERT
TO authenticated
WITH CHECK (char_length(btrim(name)) > 0);
CREATE POLICY "Authenticated can update events"
ON public.pubg_events
FOR UPDATE
TO authenticated
USING (char_length(btrim(name)) > 0)
WITH CHECK (char_length(btrim(name)) > 0);
CREATE POLICY "Authenticated can delete events"
ON public.pubg_events
FOR DELETE
TO authenticated
USING (char_length(btrim(name)) > 0);

DROP POLICY IF EXISTS "Anyone can view event popularity" ON public.pubg_event_account_popularity;
DROP POLICY IF EXISTS "Anyone can create event popularity" ON public.pubg_event_account_popularity;
DROP POLICY IF EXISTS "Anyone can update event popularity" ON public.pubg_event_account_popularity;
DROP POLICY IF EXISTS "Anyone can delete event popularity" ON public.pubg_event_account_popularity;
CREATE POLICY "Authenticated can view event popularity"
ON public.pubg_event_account_popularity
FOR SELECT
TO authenticated
USING (
  (kr_popularity >= 0)
  AND (global_popularity >= 0)
  AND (spent_popularity >= 0)
  AND (spent_popularity <= (kr_popularity + global_popularity))
);
CREATE POLICY "Authenticated can create event popularity"
ON public.pubg_event_account_popularity
FOR INSERT
TO authenticated
WITH CHECK (
  (kr_popularity >= 0)
  AND (global_popularity >= 0)
  AND (spent_popularity >= 0)
  AND (spent_popularity <= (kr_popularity + global_popularity))
);
CREATE POLICY "Authenticated can update event popularity"
ON public.pubg_event_account_popularity
FOR UPDATE
TO authenticated
USING (
  (kr_popularity >= 0)
  AND (global_popularity >= 0)
  AND (spent_popularity >= 0)
  AND (spent_popularity <= (kr_popularity + global_popularity))
)
WITH CHECK (
  (kr_popularity >= 0)
  AND (global_popularity >= 0)
  AND (spent_popularity >= 0)
  AND (spent_popularity <= (kr_popularity + global_popularity))
);
CREATE POLICY "Authenticated can delete event popularity"
ON public.pubg_event_account_popularity
FOR DELETE
TO authenticated
USING (
  (kr_popularity >= 0)
  AND (global_popularity >= 0)
  AND (spent_popularity >= 0)
  AND (spent_popularity <= (kr_popularity + global_popularity))
);