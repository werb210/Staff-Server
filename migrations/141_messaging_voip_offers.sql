-- BF_SERVER_BLOCK_43_v1
-- Optional CTA columns on communications_messages so doc-reject
-- (and future flows) can render styled action buttons in the
-- client mini-portal chat thread.
ALTER TABLE IF EXISTS communications_messages
  ADD COLUMN IF NOT EXISTS cta_label  TEXT,
  ADD COLUMN IF NOT EXISTS cta_action TEXT;

CREATE INDEX IF NOT EXISTS idx_comm_messages_cta
  ON communications_messages (application_id)
  WHERE cta_action IS NOT NULL;

-- Read-status for the application-thread endpoint so the staff
-- side can show unread counts. read_at already added in
-- 20260425_communications_read_at_and_calendar_tasks.sql.
