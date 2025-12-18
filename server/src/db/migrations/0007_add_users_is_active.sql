ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE users
SET is_active = true
WHERE is_active IS NULL;
