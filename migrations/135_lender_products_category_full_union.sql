-- 135_lender_products_category_full_union.sql
-- Expand lender_products.category CHECK to the full union of every
-- value the system has ever recognised. Nothing removed.
--
-- Legacy short codes (migration 111):
--   LOC, TERM, FACTORING, PO, EQUIPMENT, MCA, MEDIA
-- Long-form codes registered in migration 134:
--   LINE_OF_CREDIT, TERM_LOAN, INVOICE_FACTORING,
--   PURCHASE_ORDER_FINANCE, EQUIPMENT_FINANCE, STARTUP_CAPITAL
-- Long-form codes the portal sends but were missing from every
-- prior constraint (caused INSERT 23514 failures in production):
--   MERCHANT_CASH_ADVANCE, ASSET_BASED_LENDING, SBA_GOVERNMENT
--
-- 16 values total. Idempotent: DROP IF EXISTS then re-add.

ALTER TABLE IF EXISTS lender_products
  DROP CONSTRAINT IF EXISTS lender_products_category_check;

ALTER TABLE IF EXISTS lender_products
  ADD CONSTRAINT lender_products_category_check
  CHECK (
    category IN (
      'LOC',
      'TERM',
      'FACTORING',
      'PO',
      'EQUIPMENT',
      'MCA',
      'MEDIA',
      'LINE_OF_CREDIT',
      'TERM_LOAN',
      'INVOICE_FACTORING',
      'PURCHASE_ORDER_FINANCE',
      'EQUIPMENT_FINANCE',
      'STARTUP_CAPITAL',
      'MERCHANT_CASH_ADVANCE',
      'ASSET_BASED_LENDING',
      'SBA_GOVERNMENT'
    )
  );
