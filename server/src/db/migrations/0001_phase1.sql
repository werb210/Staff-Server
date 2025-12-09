-- Enums
CREATE TYPE user_type AS ENUM ('staff', 'lender', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE application_status AS ENUM ('draft', 'submitted', 'in_review', 'conditional_approval', 'approved', 'funded', 'rejected', 'withdrawn');
CREATE TYPE application_stage AS ENUM ('intake', 'document_collection', 'analysis', 'underwriting', 'offer', 'closing', 'post_funding');
CREATE TYPE product_type AS ENUM ('term_loan', 'line_of_credit', 'equipment', 'invoice_factoring', 'merchant_cash_advance', 'other');
CREATE TYPE document_category AS ENUM ('identity', 'banking', 'tax', 'financials', 'corporate', 'other');
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed', 'rejected');
CREATE TYPE owner_role AS ENUM ('primary', 'secondary', 'guarantor', 'officer');
CREATE TYPE business_entity_type AS ENUM ('llc', 'corporation', 'partnership', 'sole_proprietorship', 'non_profit', 'other');
CREATE TYPE question_type AS ENUM ('text', 'number', 'select', 'multiselect', 'date', 'boolean', 'file');
CREATE TYPE communication_type AS ENUM ('sms', 'chat', 'internal_note', 'ai_log');
CREATE TYPE communication_direction AS ENUM ('inbound', 'outbound', 'internal');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'blocked', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ocr_status AS ENUM ('pending', 'processing', 'success', 'failed');
CREATE TYPE banking_analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE marketing_event_type AS ENUM ('page_view', 'form_submission', 'campaign_click', 'email_open', 'call', 'chat', 'signup', 'conversion');
CREATE TYPE transmission_channel AS ENUM ('email', 'sms', 'webhook', 'sftp', 'api');
CREATE TYPE transmission_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'permission_change');
CREATE TYPE ai_training_source AS ENUM ('document', 'communication', 'task', 'note', 'knowledge_base');

-- Roles and users
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  user_type user_type NOT NULL DEFAULT 'staff',
  status user_status NOT NULL DEFAULT 'active',
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  timezone text,
  last_login_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  ip_address text,
  user_agent text,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Lender products and requirements
CREATE TABLE lender_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_name text NOT NULL,
  product_name text NOT NULL,
  product_type product_type NOT NULL,
  min_amount numeric(14,2),
  max_amount numeric(14,2),
  min_rate numeric(6,3),
  max_rate numeric(6,3),
  term_months integer,
  fees jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE lender_required_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_product_id uuid NOT NULL REFERENCES lender_products(id) ON DELETE CASCADE,
  title text NOT NULL,
  category document_category NOT NULL,
  description text,
  is_mandatory boolean NOT NULL DEFAULT true,
  allows_multiple boolean NOT NULL DEFAULT false,
  instructions text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Applications
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  applicant_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  lender_product_id uuid REFERENCES lender_products(id) ON DELETE SET NULL,
  status application_status NOT NULL DEFAULT 'draft',
  stage application_stage NOT NULL DEFAULT 'intake',
  requested_amount numeric(14,2),
  desired_product_type product_type,
  current_step text,
  source text,
  submitted_at timestamp,
  decision_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE business_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  dba_name text,
  entity_type business_entity_type NOT NULL,
  ein text,
  industry text,
  naics_code text,
  website text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text,
  year_established integer,
  annual_revenue numeric(14,2),
  average_monthly_revenue numeric(14,2),
  employee_count integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE applicant_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  owner_role owner_role NOT NULL DEFAULT 'primary',
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  ssn_last4 text,
  ownership_percentage numeric(5,2) NOT NULL,
  date_of_birth date,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status application_status NOT NULL,
  stage application_stage NOT NULL,
  note text,
  changed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE dynamic_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_product_id uuid REFERENCES lender_products(id) ON DELETE SET NULL,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  prompt text NOT NULL,
  question_type question_type NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT true,
  helper_text text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE uploaded_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES applicant_owners(id) ON DELETE SET NULL,
  required_document_id uuid REFERENCES lender_required_documents(id) ON DELETE SET NULL,
  document_type document_category,
  status document_status NOT NULL DEFAULT 'pending',
  file_name text NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  storage_path text NOT NULL,
  checksum text,
  is_current boolean NOT NULL DEFAULT true,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE ocr_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  status ocr_status NOT NULL DEFAULT 'pending',
  raw_text text,
  extracted_data jsonb,
  error text,
  processed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Banking analysis
CREATE TABLE banking_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  institution_name text,
  report_period_start timestamp,
  report_period_end timestamp,
  average_daily_balance numeric(14,2),
  total_deposits numeric(14,2),
  total_withdrawals numeric(14,2),
  nsf_count integer,
  risk_score integer,
  status banking_analysis_status NOT NULL DEFAULT 'pending',
  summary text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Communications and tasks
CREATE TABLE communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type communication_type NOT NULL,
  direction communication_direction NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_id text,
  occurred_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  assignee_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'open',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date timestamp,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- AI training
CREATE TABLE ai_training_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  source_type ai_training_source NOT NULL,
  source_id text,
  content text NOT NULL,
  embedding jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Marketing
CREATE TABLE marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type marketing_event_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  referrer text,
  campaign text,
  occurred_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

-- Transmissions
CREATE TABLE transmission_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid REFERENCES communications(id) ON DELETE SET NULL,
  channel transmission_channel NOT NULL,
  status transmission_status NOT NULL DEFAULT 'pending',
  request_payload jsonb,
  response_payload jsonb,
  external_id text,
  occurred_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  description text,
  changes jsonb,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
