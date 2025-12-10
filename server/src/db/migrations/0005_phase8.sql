ALTER TABLE ocr_results
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS extracted_json jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS categories_detected jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS conflicting_fields jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE banking_analysis
  ADD COLUMN IF NOT EXISTS metrics_json jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS monthly_json jsonb DEFAULT '{}'::jsonb NOT NULL;
