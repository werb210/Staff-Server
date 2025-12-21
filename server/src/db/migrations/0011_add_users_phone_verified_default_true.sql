-- Ensure phone verification column exists with the correct defaults
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "phone_verified" boolean;

ALTER TABLE users
ALTER COLUMN "phone_verified" SET DEFAULT true;

UPDATE users
SET "phone_verified" = true
WHERE "phone_verified" IS NULL;

ALTER TABLE users
ALTER COLUMN "phone_verified" SET NOT NULL;
