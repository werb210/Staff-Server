-- BF_SERVER_v?_BLOCK_1_14_V1_READINESS_AND_STAFF_NOTIFY
-- Add Step 1 KYC V1 fields to readiness_sessions so phone-based prefill
-- can hydrate all 14 wizard inputs without a token.

ALTER TABLE readiness_sessions
  ADD COLUMN IF NOT EXISTS business_location text,
  ADD COLUMN IF NOT EXISTS funding_type text,
  ADD COLUMN IF NOT EXISTS requested_amount numeric,
  ADD COLUMN IF NOT EXISTS purpose_of_funds text,
  ADD COLUMN IF NOT EXISTS sales_history_years text,
  ADD COLUMN IF NOT EXISTS annual_revenue_range text,
  ADD COLUMN IF NOT EXISTS avg_monthly_revenue_range text,
  ADD COLUMN IF NOT EXISTS accounts_receivable_range text,
  ADD COLUMN IF NOT EXISTS fixed_assets_value_range text;

-- For phone-based lookup performance.
CREATE INDEX IF NOT EXISTS readiness_sessions_phone_active_idx
  ON readiness_sessions (phone)
  WHERE is_active = true;
