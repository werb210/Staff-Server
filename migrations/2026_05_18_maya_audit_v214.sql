-- BF_SERVER_BLOCK_v214_MAYA_STAFF_PIPELINE_QUERY_v1
-- Per-tool-execution audit log. Every Maya tool dispatch (staff,
-- client, visitor) writes one row. Used for trust, debugging, and
-- rollback. Args are redacted by the caller before logging.
CREATE TABLE IF NOT EXISTS maya_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audience        TEXT NOT NULL CHECK (audience IN ('visitor','client','staff')),
  user_id         UUID,
  session_id      TEXT,
  tool            TEXT NOT NULL,
  args_redacted   JSONB,
  result_summary  TEXT,
  ok              BOOLEAN NOT NULL DEFAULT TRUE,
  error_code      TEXT
);
CREATE INDEX IF NOT EXISTS idx_maya_audit_ts
  ON maya_audit(ts DESC);
CREATE INDEX IF NOT EXISTS idx_maya_audit_audience_tool
  ON maya_audit(audience, tool);
CREATE INDEX IF NOT EXISTS idx_maya_audit_user_id
  ON maya_audit(user_id)
  WHERE user_id IS NOT NULL;
