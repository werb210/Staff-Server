-- lenders table: ensure active defaults and country enum alignment
ALTER TABLE lenders
  ADD COLUMN IF NOT EXISTS active BOOLEAN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lenders'
      AND column_name = 'status'
  ) THEN
    UPDATE lenders
    SET active = CASE
      WHEN status::text = 'INACTIVE' THEN FALSE
      ELSE TRUE
    END
    WHERE active IS NULL;
  ELSE
    UPDATE lenders
    SET active = TRUE
    WHERE active IS NULL;
  END IF;
END $$;

ALTER TABLE lenders
  ALTER COLUMN active SET DEFAULT TRUE;

ALTER TABLE lenders
  ALTER COLUMN active SET NOT NULL;

UPDATE lenders
SET country = 'BOTH'
WHERE country = 'CA_US';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'lenders'
      AND n.nspname = 'public'
      AND c.conname = 'lenders_country_check'
  ) THEN
    ALTER TABLE lenders
      ADD CONSTRAINT lenders_country_check
      CHECK (country IN ('CA', 'US', 'BOTH'));
  END IF;
END $$;

-- lender_products table: add country + rate fields and align enums
ALTER TABLE lender_products
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS rate_type TEXT,
  ADD COLUMN IF NOT EXISTS min_rate TEXT,
  ADD COLUMN IF NOT EXISTS max_rate TEXT;

UPDATE lender_products
SET country = 'BOTH'
WHERE country IS NULL OR country = 'CA_US';

ALTER TABLE lender_products
  ALTER COLUMN country SET DEFAULT 'BOTH';

ALTER TABLE lender_products
  ALTER COLUMN country SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'lender_products'
      AND n.nspname = 'public'
      AND c.conname = 'lender_products_country_check'
  ) THEN
    ALTER TABLE lender_products
      ADD CONSTRAINT lender_products_country_check
      CHECK (country IN ('CA', 'US', 'BOTH'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'lender_products'
      AND n.nspname = 'public'
      AND c.conname = 'lender_products_rate_type_check'
  ) THEN
    ALTER TABLE lender_products
      ADD CONSTRAINT lender_products_rate_type_check
      CHECK (rate_type IS NULL OR rate_type IN ('VARIABLE', 'FIXED'));
  END IF;
END $$;
