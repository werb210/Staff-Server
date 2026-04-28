-- BF_NOTIFICATIONS_v50 + BF_NOTIFICATIONS_v50_FIX — fully idempotent + defensive.
-- Handles three database states:
--   (a) fresh DB → CREATE creates the table with all columns; ADD COLUMN IF NOT EXISTS
--       is a no-op; constraint adds; index adds.
--   (b) DB already has our notifications table → CREATE is no-op; ADD COLUMN IF NOT
--       EXISTS is no-op; constraint already exists (no-op); index already exists (no-op).
--   (c) DB has a DIFFERENT pre-existing notifications table (the failure mode that hit
--       prod) → CREATE is no-op; ADD COLUMN IF NOT EXISTS adds each missing column;
--       constraint adds; index adds.

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text,
  type        text,
  ref_table   text,
  ref_id      text,
  body        text,
  context_url text,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz
);

-- Backfill columns that may be missing on a pre-existing notifications table.
-- Columns are nullable here so the ADD succeeds against tables with existing rows;
-- the application only ever inserts non-null values for these fields.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id     text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type        text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ref_table   text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ref_id      text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body        text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS context_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read     boolean NOT NULL DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at     timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_unique_per_ref'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_unique_per_ref
      UNIQUE (user_id, ref_table, ref_id, type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);
