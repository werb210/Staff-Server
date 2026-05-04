-- BF_SERVER_BLOCK_v106_LENDER_PORTAL_BACKEND_v1
-- users.lender_id already exists per migration 032; add an index for the
-- per-lender query path the new endpoints take. Idempotent.

CREATE INDEX IF NOT EXISTS idx_users_lender_id ON users(lender_id) WHERE lender_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'lender_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_applications_lender_id
      ON applications(lender_id) WHERE lender_id IS NOT NULL;
  END IF;
END $$;
