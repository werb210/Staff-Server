-- 0001_init.sql

CREATE TABLE IF NOT EXISTS applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text,
    last_name text,
    email text,
    business_name text,
    status text DEFAULT 'new',
    amount_requested integer,
    country text,
    industry text,
    purpose text,
    created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lenders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    country text,
    active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS deals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid,
    lender_id uuid,
    status text DEFAULT 'in_review',
    created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid,
    legal_name text,
    operating_name text,
    address text,
    city text,
    province text,
    postal_code text,
    country text,
    created_at timestamp DEFAULT now()
);
