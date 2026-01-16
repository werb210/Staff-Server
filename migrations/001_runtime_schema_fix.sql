ALTER TABLE applications
ADD COLUMN IF NOT EXISTS owner_user_id UUID;

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS pipeline_state TEXT DEFAULT 'new';

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE applications
SET name = business_legal_name
WHERE name IS NULL;

ALTER TABLE idempotency_keys
ALTER COLUMN method DROP NOT NULL;
