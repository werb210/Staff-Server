-- Phase 4 document system migration
ALTER TABLE documents ADD COLUMN IF NOT EXISTS blob_key text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS checksum_sha256 text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_validated_at timestamptz;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS missing_flag boolean NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS restored_flag boolean NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS azure_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE documents ALTER COLUMN version SET DEFAULT 1;
UPDATE documents SET blob_key = COALESCE(blob_key, storage_path) WHERE blob_key IS NULL;
UPDATE documents SET checksum_sha256 = COALESCE(checksum_sha256, checksum) WHERE checksum_sha256 IS NULL;
ALTER TABLE documents ALTER COLUMN blob_key SET NOT NULL;
ALTER TABLE documents ALTER COLUMN checksum_sha256 SET NOT NULL;

ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS blob_key text;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS checksum_sha256 text;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS azure_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE document_versions SET blob_key = COALESCE(blob_key, storage_path) WHERE blob_key IS NULL;
UPDATE document_versions SET checksum_sha256 = COALESCE(checksum_sha256, checksum) WHERE checksum_sha256 IS NULL;
ALTER TABLE document_versions ALTER COLUMN blob_key SET NOT NULL;
ALTER TABLE document_versions ALTER COLUMN checksum_sha256 SET NOT NULL;

CREATE TABLE IF NOT EXISTS document_integrity_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_integrity_events_document_idx ON document_integrity_events(document_id);

CREATE TABLE IF NOT EXISTS lender_required_documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_product_id uuid NOT NULL REFERENCES lender_products(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    category text NOT NULL DEFAULT 'general',
    is_mandatory boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lender_required_documents_product_idx ON lender_required_documents(lender_product_id);

CREATE TABLE IF NOT EXISTS required_doc_map (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_product_id uuid NOT NULL REFERENCES lender_products(id) ON DELETE CASCADE,
    required_document_id uuid NOT NULL REFERENCES lender_required_documents(id) ON DELETE CASCADE,
    is_required boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS required_doc_map_document_idx ON required_doc_map(required_document_id);
