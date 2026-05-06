-- BF_SERVER_BLOCK_v185_LENDER_PACKAGE_DEDUP_v1
-- Partial unique index on send_lender_package jobs scoped per application.
-- Prevents duplicate enqueue when SignNow retries the same webhook delivery.
-- Idempotent: CREATE UNIQUE INDEX IF NOT EXISTS.

CREATE UNIQUE INDEX IF NOT EXISTS job_queue_lender_package_dedup_idx
  ON job_queue ((payload->>'applicationId'))
  WHERE type = 'send_lender_package'
    AND status IN ('pending','running');

DO $$ BEGIN RAISE NOTICE 'BF_SERVER_BLOCK_v185_LENDER_PACKAGE_DEDUP_v1 applied'; END $$;
