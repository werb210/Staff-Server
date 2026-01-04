# Staff Server

## Local setup

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Create a `.env` from `.env.example` and fill in required values.
3. Run migrations:
   ```bash
   npm run build
   node dist/migrationsCheck.js
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Required environment variables

The service expects these to be set (see `.env.example`):

- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `BUILD_TIMESTAMP`
- `COMMIT_SHA`

Additional configuration is optional but recommended (rate limits, lockout policy, token expirations).

## Common commands

- `npm run build` – compile TypeScript into `dist/`
- `npm test` – run Jest tests
- `npm run migrate:check` – validate migrations and schema
- `npm start` – run the compiled server

## Health endpoints

- `GET /api/_int/health` – liveness (process up)
- `GET /api/_int/ready` – readiness (env + database connectivity)
- `GET /api/_int/version` – build and schema version info

## Business intelligence reporting

Admin-only reporting endpoints are available under `/api/reporting`:

- `GET /api/reporting/pipeline/summary`
- `GET /api/reporting/pipeline/timeseries`
- `GET /api/reporting/lenders/performance`
- `GET /api/reporting/applications/volume`
- `GET /api/reporting/documents/metrics`
- `GET /api/reporting/staff/activity`

BI aggregation jobs can be controlled via:

- `BI_JOBS_ENABLED` (default: enabled in production, disabled in test)
- `BI_DAILY_JOB_INTERVAL_MS`
- `BI_HOURLY_JOB_INTERVAL_MS`
