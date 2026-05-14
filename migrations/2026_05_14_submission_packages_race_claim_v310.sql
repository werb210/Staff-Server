-- BF_SERVER_BLOCK_v310_SUBMISSION_PACKAGE_RACE_CLAIM_v1
-- maybeBuildAndSendPackage() in src/services/submission/orchestrator.ts had
-- a TOCTOU race exactly mirroring BI v270:
--
--   1. SELECT FROM application_packages WHERE application_id = $1
--      -- "already sent" early-exit if any row exists.
--   2. dispatchToSelected(...)  -- sends actual emails / inserts packages.
--
-- Two concurrent staff clicks of "Send to lenders" both pass step 1 with 0
-- rows, both run dispatchToSelected, both send duplicate emails, and both
-- INSERT application_packages rows. The maybeStartCreditSummaryAndSign
-- (stageA) handler already has the atomic-claim pattern via
-- applications.submission_chain_started_at (added in migration
-- 20260430_submission_orchestration.sql by BF_SERVER_BLOCK_v179). Add the
-- parallel column for stageB (package dispatch) so the same claim pattern
-- can be applied without colliding with stageA semantics.

ALTER TABLE IF EXISTS applications
  ADD COLUMN IF NOT EXISTS submission_packages_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS applications_submission_packages_started_at_idx
  ON applications(submission_packages_started_at);
