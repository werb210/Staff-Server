-- BF_SERVER_BLOCK_v108_REVERT_LENDER_BACKEND_v1
-- The lender_api_keys table was created on the wrong service. The lender
-- system lives on BI-Server (bi_lender_api_keys). Drop the BF-Server copy
-- before any data is written to it.
DROP TABLE IF EXISTS lender_api_keys;
