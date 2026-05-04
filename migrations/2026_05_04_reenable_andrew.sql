-- BF_SERVER_BLOCK_v104_REENABLE_ANDREW_v1
-- Re-enable Andrew so he can log in. Idempotent.
-- Targets by both email and phone in case one was edited away from the seed.

UPDATE users
   SET disabled  = false,
       active    = true,
       is_active = true,
       status    = 'ACTIVE'
 WHERE LOWER(email) = LOWER('andrew@boreal.financial')
    OR phone_number = '+17802648467';

-- Audit trail so we can see this happened in the logs.
DO $$
DECLARE
  affected_rows INT;
BEGIN
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'BF_SERVER_v104: re-enabled % user row(s) for andrew', affected_rows;
END $$;
