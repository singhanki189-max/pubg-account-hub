DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pubg_accounts'
      AND column_name = 'email_level'
  ) THEN
    ALTER TABLE public.pubg_accounts
      ADD COLUMN email_level integer NOT NULL DEFAULT 0;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pubg_accounts_email_level_non_negative'
      AND conrelid = 'public.pubg_accounts'::regclass
  ) THEN
    ALTER TABLE public.pubg_accounts
      ADD CONSTRAINT pubg_accounts_email_level_non_negative CHECK (email_level >= 0);
  END IF;
END
$$;