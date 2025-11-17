-- ---------------------------------------------------------------------------
-- 0001_init.sql
-- Full Boreal Financial schema for Azure PostgreSQL
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- CONTACTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(200),
  phone VARCHAR(50),
  silo VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- COMPANIES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(200),
  website VARCHAR(300),
  owner_contact_id UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- DEALS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  amount_requested INTEGER,
  stage VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- APPLICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(200),
  phone VARCHAR(50),

  business_name VARCHAR(300),
  industry VARCHAR(200),
  years_in_business INTEGER,

  country VARCHAR(20),
  amount_requested INTEGER,

  last_12mo_revenue INTEGER,
  avg_monthly_revenue INTEGER,

  purpose TEXT,

  status VARCHAR(50) DEFAULT 'New',

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- DOCUMENTS (Azure Blob Storage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  mime_type VARCHAR(200),

  blob_path VARCHAR(500) NOT NULL,

  checksum VARCHAR(128),

  version INTEGER DEFAULT 1 NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- LENDERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  country VARCHAR(10) NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- LENDER PRODUCTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lender_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lender_id UUID NOT NULL,

  product_type VARCHAR(50),
  min_amount INTEGER,
  max_amount INTEGER,

  min_fico INTEGER,
  min_years_in_business INTEGER,
  requires_financials BOOLEAN DEFAULT FALSE,
  requires_bank_statements BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  type VARCHAR(50) NOT NULL,
  payload JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- AUDIT LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  action VARCHAR(200) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
