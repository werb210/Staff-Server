-- BF_SERVER_BLOCK_v105_USER_MGMT_AND_LENDERS_SILO_v1
-- Re-enable Caden so OTP verify no longer returns "Account is disabled".
UPDATE users
SET
  disabled = false,
  is_active = true,
  active = true,
  status = 'ACTIVE',
  updated_at = now()
WHERE
  lower(coalesce(email, '')) = lower('caden@borealfinancial.com')
  OR regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') IN ('14035550199', '4035550199');
