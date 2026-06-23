DROP POLICY IF EXISTS "Anyone can add pubg accounts" ON public.pubg_accounts;
DROP POLICY IF EXISTS "Anyone can update pubg accounts" ON public.pubg_accounts;
DROP POLICY IF EXISTS "Anyone can delete pubg accounts" ON public.pubg_accounts;

CREATE POLICY "Create pubg accounts with valid values"
ON public.pubg_accounts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  gmail ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND uc >= 0
  AND cards >= 0
  AND mix_pop >= 0
);

CREATE POLICY "Update pubg accounts with valid values"
ON public.pubg_accounts
FOR UPDATE
TO anon, authenticated
USING (
  gmail ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND uc >= 0
  AND cards >= 0
  AND mix_pop >= 0
)
WITH CHECK (
  gmail ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND uc >= 0
  AND cards >= 0
  AND mix_pop >= 0
);

CREATE POLICY "Delete pubg accounts with valid rows"
ON public.pubg_accounts
FOR DELETE
TO anon, authenticated
USING (
  gmail ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND uc >= 0
  AND cards >= 0
  AND mix_pop >= 0
);