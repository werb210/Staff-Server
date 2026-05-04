-- BF_SERVER_BLOCK_v107_LENDER_API_KEYS_v1
CREATE TABLE IF NOT EXISTS lender_api_keys (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id          UUID         NOT NULL REFERENCES lenders(id) ON DELETE CASCADE,
  key_prefix         TEXT         NOT NULL UNIQUE,
  key_hash           TEXT         NOT NULL,
  scopes             TEXT[]       NOT NULL DEFAULT ARRAY['applications:write','applications:read'],
  rate_limit_per_min INT          NOT NULL DEFAULT 60,
  last_used_at       TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by         UUID
);
CREATE INDEX IF NOT EXISTS idx_lender_api_keys_lender_id ON lender_api_keys(lender_id);
CREATE INDEX IF NOT EXISTS idx_lender_api_keys_active ON lender_api_keys(key_prefix) WHERE revoked_at IS NULL;
