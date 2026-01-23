-- lenders table
ALTER TABLE lenders
ADD COLUMN IF NOT EXISTS country TEXT;

-- lender_products table
ALTER TABLE lender_products
ADD COLUMN IF NOT EXISTS required_documents JSONB NOT NULL DEFAULT '[]';
