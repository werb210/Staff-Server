-- Update application status enum to phase 3 values
ALTER TABLE applications ALTER COLUMN status DROP DEFAULT;
UPDATE applications SET status = 'new';
ALTER TABLE applications ALTER COLUMN status TYPE text;
DROP TYPE IF EXISTS application_status;
CREATE TYPE application_status AS ENUM (
    'new',
    'requires_docs',
    'startup_pipeline',
    'review',
    'lender_selection',
    'accepted',
    'declined'
);
ALTER TABLE applications ALTER COLUMN status TYPE application_status USING status::application_status;
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'new';

-- Remove legacy columns
DROP INDEX IF EXISTS applications_company_idx;
ALTER TABLE applications
    DROP COLUMN IF EXISTS company_id,
    DROP COLUMN IF EXISTS contact_id,
    DROP COLUMN IF EXISTS deal_id,
    DROP COLUMN IF EXISTS lender_product_id,
    DROP COLUMN IF EXISTS current_step,
    DROP COLUMN IF EXISTS kyc_answers,
    DROP COLUMN IF EXISTS product_selections,
    DROP COLUMN IF EXISTS applicant_profile,
    DROP COLUMN IF EXISTS business_profile,
    DROP COLUMN IF EXISTS requested_amount;

-- Product category enum
DO $$ BEGIN
    CREATE TYPE product_category AS ENUM (
        'working_capital',
        'term_loan',
        'line_of_credit',
        'invoice_factoring',
        'equipment_financing',
        'purchase_order',
        'startup'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add new application fields
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS product_category product_category DEFAULT 'working_capital',
    ADD COLUMN IF NOT EXISTS kyc_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS business_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS applicant_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS product_selection jsonb DEFAULT '{}'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS signature_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS applications_category_idx ON applications(product_category);
ALTER TABLE applications ALTER COLUMN product_category DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN product_category SET NOT NULL;

-- Owners table
CREATE TABLE IF NOT EXISTS applicant_owners (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip text NOT NULL,
    dob text NOT NULL,
    ssn text NOT NULL,
    ownership_percentage integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Status history table
CREATE TABLE IF NOT EXISTS application_status_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status text,
    to_status text NOT NULL,
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    changed_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Timeline events table
CREATE TABLE IF NOT EXISTS application_timeline_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL
);
