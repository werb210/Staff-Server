-- Align users table with current Drizzle schema and auth expectations
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" text,
  ADD COLUMN IF NOT EXISTS "phone_verified" boolean,
  ADD COLUMN IF NOT EXISTS "is_active" boolean,
  ADD COLUMN IF NOT EXISTS "created_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "last_login_at" timestamptz;

-- Ensure defaults and non-null constraints match application expectations
ALTER TABLE "users"
  ALTER COLUMN "phone_verified" SET DEFAULT false,
  ALTER COLUMN "is_active" SET DEFAULT true,
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now();

UPDATE "users"
SET "phone_verified" = false
WHERE "phone_verified" IS NULL;

UPDATE "users"
SET "is_active" = true
WHERE "is_active" IS NULL;

UPDATE "users"
SET "created_at" = now()
WHERE "created_at" IS NULL;

UPDATE "users"
SET "updated_at" = now()
WHERE "updated_at" IS NULL;

ALTER TABLE "users"
  ALTER COLUMN "phone_verified" SET NOT NULL,
  ALTER COLUMN "is_active" SET NOT NULL,
  ALTER COLUMN "created_at" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

-- Backfill administrative accounts
UPDATE "users"
SET
  "phone_verified" = true,
  "is_active" = true
WHERE lower("role"::text) = 'admin';
