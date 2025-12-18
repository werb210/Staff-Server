-- REQUIREMENT:
-- PostgreSQL with pgcrypto enabled
-- This script is SAFE to run multiple times (idempotent)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (
  email,
  phone,
  role,
  password_hash,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'todd.w@boreal.financial',
  '+15878881837',
  'admin',
  crypt('1Sucker1!', gen_salt('bf')),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email)
DO UPDATE SET
  phone = EXCLUDED.phone,
  role = 'admin',
  password_hash = crypt('1Sucker1!', gen_salt('bf')),
  is_active = true,
  updated_at = NOW();
