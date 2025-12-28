# Azure App Service Deployment Notes

These settings mirror the environment Azure App Service uses when running the production server.

## Runtime
- **Stack:** Node.js 20 LTS
- **Start command:** `npm run start`
- **Working directory:** `/home/site/wwwroot`
- `server/package.json` declares `"main": "dist/index.js"` and a start script of `node dist/index.js`.

## Application settings
Set these App Settings in Azure:
- `NODE_ENV=production`
- `PORT=8080`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true` (enable Oryx/remote builds)
- `JWT_SECRET=<strong secret value>`
- `OTP_ENABLED=false` (set to `true` only when Twilio Verify is fully configured)
- Provide required secrets (database, JWT, token secrets, Azure Blob credentials, Twilio keys) with production values.

## Dependencies
- Runtime dependencies must be present before Azure starts `npm start`.
- Keep all runtime libraries (Express, PG, etc.) in `server/package.json` dependencies so Oryx installs them during deployment.

## Deployment/build tips
- Build artifacts are produced in `server/dist` via `npm run build`.
- Deploy the source ZIP or folder (including `server/package.json` and `server/tsconfig.json`); Azure/Oryx runs `npm install` and `npm run build` during deployment.
- `server/oryx-manifest.toml` pins Node 20 and the start command for the App Service runtime.

## Smoke test (Azure-equivalent)
1. Set production-like environment variables (including database URL, JWT/Access/Refresh secrets, Azure Blob keys, and Twilio credentials or placeholders that satisfy validation).
2. Run the build: `npm run build`.
3. Start the server: `NODE_ENV=production PORT=8080 npm run start`.
4. Verify health: `curl -f http://localhost:8080/api/_int/health` and `curl -f http://localhost:8080/api/_int/routes`.
