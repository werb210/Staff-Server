-- Phase 5 scaffolding migration
ALTER TABLE applications ADD COLUMN IF NOT EXISTS credit_summary_version integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS credit_summaries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    version integer NOT NULL DEFAULT 1,
    summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    pdf_blob_key text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_summaries_application_idx ON credit_summaries(application_id);
CREATE INDEX IF NOT EXISTS credit_summaries_version_idx ON credit_summaries(application_id, version);

CREATE TABLE IF NOT EXISTS ai_training_chunks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    document_version_id uuid REFERENCES document_versions(id) ON DELETE SET NULL,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    provider text NOT NULL,
    request_type text NOT NULL,
    prompt text NOT NULL,
    response text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lender_dynamic_questions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_product_id uuid NOT NULL REFERENCES lender_products(id) ON DELETE CASCADE,
    applies_to text NOT NULL,
    prompt text NOT NULL,
    field_type text NOT NULL,
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    display_order integer NOT NULL DEFAULT 0,
    is_required boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lender_required_documents ADD COLUMN IF NOT EXISTS validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE lender_required_documents ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ocr_results (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    document_version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE SET NULL,
    blob_key text NOT NULL,
    extracted_text jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'completed',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banking_analysis (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    document_version_id uuid REFERENCES document_versions(id) ON DELETE SET NULL,
    summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'completed',
    created_at timestamptz NOT NULL DEFAULT now()
);
