CREATE TABLE public.pubg_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail TEXT NOT NULL,
  uc INTEGER NOT NULL DEFAULT 0 CHECK (uc >= 0),
  cards INTEGER NOT NULL DEFAULT 0 CHECK (cards >= 0),
  mix_pop INTEGER NOT NULL DEFAULT 0 CHECK (mix_pop >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pubg_accounts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pubg_accounts TO authenticated;
GRANT ALL ON public.pubg_accounts TO service_role;

ALTER TABLE public.pubg_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pubg accounts"
ON public.pubg_accounts
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can add pubg accounts"
ON public.pubg_accounts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update pubg accounts"
ON public.pubg_accounts
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete pubg accounts"
ON public.pubg_accounts
FOR DELETE
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.set_pubg_accounts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_pubg_accounts_updated_at_trigger
BEFORE UPDATE ON public.pubg_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_pubg_accounts_updated_at();