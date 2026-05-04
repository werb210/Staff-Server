-- BF_SERVER_BLOCK_v104_USER_MGMT_FIX_v1
-- One-shot bootstrap: re-enable Andrew so he can log in and use the
-- Enable/Disable button to fix any other locked-out users.
-- Idempotent: runs once via schema_migrations; UPDATE on identical
-- values is a no-op regardless.

UPDATE users
   SET disabled  = false,
       active    = true,
       is_active = true,
       status    = 'ACTIVE'
 WHERE LOWER(email) = LOWER('andrew@boreal.financial')
    OR phone_number = '+17802648467';

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'BF_SERVER_v104: re-enabled % andrew row(s)', affected;
END $$;
