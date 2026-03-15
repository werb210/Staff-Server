ALTER TABLE users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

UPDATE users
SET status = 'active'
WHERE status IS NULL;
