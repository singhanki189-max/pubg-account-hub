ALTER TABLE public.pubg_sales_entries
  ADD COLUMN IF NOT EXISTS sender_id text,
  ADD COLUMN IF NOT EXISTS popularity_sent bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_mode text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS buy_amount bigint NOT NULL DEFAULT 0;

UPDATE public.pubg_sales_entries
SET sender_id = gmail
WHERE sender_id IS NULL OR sender_id = '';

ALTER TABLE public.pubg_sales_entries
  ALTER COLUMN sender_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pubg_sales_entries_sale_mode_check'
      AND conrelid = 'public.pubg_sales_entries'::regclass
  ) THEN
    ALTER TABLE public.pubg_sales_entries
      ADD CONSTRAINT pubg_sales_entries_sale_mode_check
      CHECK (sale_mode IN ('direct', 'reselling'));
  END IF;
END $$;