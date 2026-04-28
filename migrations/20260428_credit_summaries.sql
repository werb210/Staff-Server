-- BF_CREDIT_SUMMARY_v45 — V1 step 7 schema. Idempotent.
-- credit_summaries: one current row per application (the "live" summary).
-- credit_summary_versions: append-only history; one row per generate/save/submit.
-- V2 forward-compat (§7): ai_suggestions, inputs_snapshot, version, is_locked
-- columns are reserved here so V2's AI suggestions panel + version history slot
-- in without a schema change.

CREATE TABLE IF NOT EXISTS credit_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  text NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  sections        jsonb NOT NULL DEFAULT '{}'::jsonb,
  inputs_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_suggestions  jsonb NOT NULL DEFAULT '{}'::jsonb,
  version         int  NOT NULL DEFAULT 1,
  is_locked       boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'draft',
  generated_at    timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_summaries_status_check'
  ) THEN
    ALTER TABLE credit_summaries
      ADD CONSTRAINT credit_summaries_status_check
      CHECK (status IN ('draft','submitted','locked'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS credit_summary_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_summary_id uuid NOT NULL REFERENCES credit_summaries(id) ON DELETE CASCADE,
  application_id    text NOT NULL,
  version           int  NOT NULL,
  sections          jsonb NOT NULL,
  inputs_snapshot   jsonb,
  reason            text NOT NULL,        -- 'generated' | 'edited' | 'submitted'
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_summary_versions_app
  ON credit_summary_versions(application_id, version);

CREATE INDEX IF NOT EXISTS idx_credit_summaries_status
  ON credit_summaries(status);
