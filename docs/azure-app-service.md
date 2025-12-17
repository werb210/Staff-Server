# Azure App Service Deployment Notes

These settings mirror the environment Azure App Service uses when running the production server.

## Runtime
- **Stack:** Node.js 20 LTS
- **Start command:** `npm start`
- **Working directory:** `/home/site/wwwroot`
- `server/package.json` declares `"main": "dist/index.js"` and a start script of `node dist/index.js`.

## Application settings
Set these App Settings in Azure:
- `NODE_ENV=production`
- `PORT=8080`
- Provide required secrets (database, JWT, token secrets, Azure Blob credentials, Twilio keys) with production values.

## Dependencies
- Runtime dependencies must be present before Azure starts `npm start`.
- `twilio@^5.10.7` is required at runtime; keep it in `server/package.json` dependencies so installs pull it in.

## Deployment/build tips
- Build artifacts are produced in `server/dist` via `npm run build`.
- Oryx can build from the repo or you can deploy a prebuilt artifact. Ensure runtime deps are installed either way.
- `server/oryx-manifest.toml` pins Node 20 and the start command for Oryx-based deployments.

## Smoke test (Azure-equivalent)
1. Set production-like environment variables (including database URL, JWT/Access/Refresh secrets, Azure Blob keys, and Twilio credentials or placeholders that satisfy validation).
2. Run the build: `npm --prefix server run build`.
3. Start the server: `NODE_ENV=production PORT=8080 node server/dist/index.js`.
4. Verify health: `curl -f http://localhost:8080/api/_int/health` and `curl -f http://localhost:8080/api/_int/routes`.
