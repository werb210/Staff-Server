-- BF_AZURE_OCR_TERMSHEET_v44 — idempotent.

-- documents: blob metadata + banking auto-run column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS blob_name      TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS blob_url       TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS banking_status TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_blob_name ON documents(blob_name);
CREATE INDEX IF NOT EXISTS idx_documents_banking_status ON documents(banking_status);

-- offers: term sheet upload metadata + archival
ALTER TABLE offers ADD COLUMN IF NOT EXISTS term_sheet_blob_name   TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS term_sheet_filename    TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS term_sheet_size_bytes  BIGINT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS term_sheet_uploaded_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_archived            BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS archived_at            TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_offers_application_active
  ON offers(application_id) WHERE is_archived = FALSE;
