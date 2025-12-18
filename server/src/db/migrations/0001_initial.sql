CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'locked');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE deal_stage AS ENUM ('prospect', 'qualified', 'proposal', 'closed_won', 'closed_lost');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE transmission_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE transmission_channel AS ENUM ('email', 'sms', 'webhook', 'sftp', 'api');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Admin', 'Staff', 'Lender', 'Referrer');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
    CREATE TYPE audit_event_type AS ENUM ('login_success', 'login_failure');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Core entities
CREATE TABLE IF NOT EXISTS companies (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    industry text,
    website text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role user_role NOT NULL DEFAULT 'Staff',
    status user_status NOT NULL DEFAULT 'active',
    company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    title text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contacts_company_idx ON contacts(company_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);

CREATE TABLE IF NOT EXISTS deals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
    name text NOT NULL,
    stage deal_stage NOT NULL DEFAULT 'prospect',
    value numeric(14,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deals_company_idx ON deals(company_id);
CREATE INDEX IF NOT EXISTS deals_stage_idx ON deals(stage);

CREATE TABLE IF NOT EXISTS lender_products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_name text NOT NULL,
    product_name text NOT NULL,
    product_type text NOT NULL,
    min_amount numeric(14,2),
    max_amount numeric(14,2),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lender_products_lender_idx ON lender_products(lender_name);

CREATE TABLE IF NOT EXISTS product_required_docs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_product_id uuid NOT NULL REFERENCES lender_products(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    is_mandatory boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_questions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    lender_product_id uuid NOT NULL REFERENCES lender_products(id) ON DELETE CASCADE,
    question text NOT NULL,
    field_type text NOT NULL,
    is_required boolean NOT NULL DEFAULT true,
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
    lender_product_id uuid REFERENCES lender_products(id) ON DELETE SET NULL,
    status application_status NOT NULL DEFAULT 'draft',
    current_step integer NOT NULL DEFAULT 1,
    kyc_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    product_selections jsonb NOT NULL DEFAULT '{}'::jsonb,
    applicant_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
    business_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
    requested_amount integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS applications_company_idx ON applications(company_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);

CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
    company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
    contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    storage_path text NOT NULL,
    checksum text NOT NULL,
    version integer NOT NULL DEFAULT 1,
    size_bytes integer NOT NULL,
    uploaded_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_application_idx ON documents(application_id);
CREATE INDEX IF NOT EXISTS documents_checksum_idx ON documents(checksum);

CREATE TABLE IF NOT EXISTS document_versions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number integer NOT NULL DEFAULT 1,
    storage_path text NOT NULL,
    checksum text NOT NULL,
    size_bytes integer NOT NULL,
    is_current boolean NOT NULL DEFAULT true,
    uploaded_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_versions_document_idx ON document_versions(document_id);

CREATE TABLE IF NOT EXISTS transmissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
    channel transmission_channel NOT NULL,
    status transmission_status NOT NULL DEFAULT 'pending',
    request_payload jsonb,
    response_payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    email_attempt text NOT NULL,
    event_type audit_event_type NOT NULL,
    ip_address text,
    user_agent text,
    "timestamp" timestamptz NOT NULL DEFAULT now()
);
