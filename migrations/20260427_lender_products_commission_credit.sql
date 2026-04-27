-- BF_LP_COMMISSION_CREDIT_v36 — Block 36
-- Adds commission % (used internally for ROI/ad-spend reporting) and
-- min_credit_score (integer threshold matching the lender-product UX bands:
-- Under 560 / 561-600 / 600-660 / 661-720 / Over 720; stored as the lower
-- bound of the band, e.g. "Over 720" -> 720, "Under 560" -> 0).
ALTER TABLE lender_products
  ADD COLUMN IF NOT EXISTS commission NUMERIC(6, 3),
  ADD COLUMN IF NOT EXISTS min_credit_score INTEGER;

COMMENT ON COLUMN lender_products.commission IS
  'Commission percent paid to broker on closed deals. Internal-only; not surfaced to applicants.';
COMMENT ON COLUMN lender_products.min_credit_score IS
  'Minimum credit score the lender will accept. 0 = no minimum.';
