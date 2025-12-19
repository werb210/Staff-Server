ALTER TABLE "users"
  ADD COLUMN "phone" text,
  ADD COLUMN "phone_verified" boolean NOT NULL DEFAULT false;
