-- BF_SERVER_BLOCK_v177_BANKING_WORKER_RETRY_v1
-- banking_analyses retry tracking. Pre-v177 the worker had no
-- attempt counter and no backoff: failed rows would be picked up on
-- every tick and re-analyzed immediately. Idempotent ALTERs.

ALTER TABLE banking_analyses
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS banking_analyses_next_attempt_idx
  ON banking_analyses(next_attempt_at) WHERE status = 'failed';
