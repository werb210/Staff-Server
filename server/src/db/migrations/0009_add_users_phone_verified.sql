ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone_verified" boolean NOT NULL DEFAULT false;
