# Login and admin password reset

These steps make the production login flow work for `admin@boreal.financial` and document the one-time reset process on Azure App Service.

## One-time admin password reset on Azure App Service
1. In the Azure Portal for the App Service, add an Application Setting named `ADMIN_RESET_PASSWORD` with the value `ChangeMe123!`. (Optional) Add `TARGET_EMAIL` if you need to reset a different account; the default is `admin@boreal.financial`.
2. Restart the App Service so the new setting is loaded.
3. Open the App Service **SSH** console and run the reset from the deployed codebase:
   ```bash
   cd /home/site/wwwroot
   npm --prefix server run reset-admin-password
   ```
   The script exits non-zero if the user is missing.
4. After confirming a `200` login, remove the `ADMIN_RESET_PASSWORD` setting (Portal > Configuration) so it is not stored long term. If you exported the variable manually in the SSH session, you can also clear it with `unset ADMIN_RESET_PASSWORD` before closing the shell.

## Smoke checks
- Health: `curl -i https://server.boreal.financial/api/internal/health`
- Login: `curl -i https://server.boreal.financial/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@boreal.financial","password":"ChangeMe123!"}'`
