-- BF_SERVER_BLOCK_v198_LENDER_MATCH_GATE_AND_CACHE_v1
-- Lender-match cache. matchLenders() is no longer run inline on every
-- /api/applications/:id/lenders read. Instead it runs ONCE at the moment the
-- last outstanding required document is accepted (see
-- src/services/lenderMatchCache.ts + src/routes/portal.ts accept handler).
-- Reject paths mark the cache stale; staff can force a recompute via
-- POST /api/applications/:id/lenders/recalculate.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS lender_matches jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS lender_matches_computed_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS lender_matches_stale boolean DEFAULT true NOT NULL;
