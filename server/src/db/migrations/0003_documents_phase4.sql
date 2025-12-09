-- Phase 4 document system extensions
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_filename text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_key text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS checksum_sha256 text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS accepted boolean;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejected_reason text;

ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS version integer;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS s3_key text;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS checksum_sha256 text;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE TABLE IF NOT EXISTS lender_required_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lender_product_id uuid NOT NULL REFERENCES lender_products(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  display_name text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_integrity_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
