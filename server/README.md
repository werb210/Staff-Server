# Boreal Staff App Backend

This directory contains the TypeScript/Express backend scaffold for the Boreal Staff App. The service exposes stubbed, type-safe endpoints that validate payloads with Zod and log every interaction for easy tracing.

## Prerequisites

- Node.js 22+
- npm 10+

## Installation

```bash
npm install
```

> Run the command from the repository root to install dependencies declared in `server/package.json`.

## Development

```bash
npm run dev
```

The development server uses [`tsx`](https://github.com/esbuild-kit/tsx) to run `server/src/index.ts` with hot reloading.

## Production Build

```bash
npm run build
```

The build script compiles the TypeScript sources into JavaScript emitted in `server/dist`.

## Start

```bash
npm start
```

Runs the application without watch mode. The server listens on `process.env.PORT` or falls back to `5000`.

## Environment Variables

Copy `.env.example` to `.env` and adjust values as needed before running the server. The stub services read configuration via `loadEnv()`.

## Available Routes

| Domain | Base Path |
| --- | --- |
| Health | `/api/health` |
| Applications | `/api/applications` |
| Documents | `/api/documents` |
| Lenders | `/api/lenders` |
| Communication | `/api/communication` |
| Marketing | `/api/marketing` |
| Admin | `/api/admin` |
| Pipeline | `/api/pipeline` |
| Office 365 | `/api/office365` |
| LinkedIn | `/api/linkedin` |

All routes respond with a JSON body containing at least `{ "message": "OK" }` and rely on Zod schemas for validation.

## Quick Verification

After starting the server with `npm start` you can verify the health endpoint:

```bash
curl http://localhost:5000/api/health
```

The response is:

```json
{"message":"OK","status":"ok"}
```

## Example curl Commands

### Applications

```bash
curl -X GET http://localhost:5000/api/applications
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"applicantName":"Alice","email":"alice@example.com","phone":"+123456789","amount":150000,"productType":"mortgage"}'
curl -X PUT http://localhost:5000/api/applications/<APPLICATION_ID> \
  -H "Content-Type: application/json" \
  -d '{"notes":"Updated"}'
curl -X PUT http://localhost:5000/api/applications/<APPLICATION_ID>/submit \
  -H "Content-Type: application/json" \
  -d '{"submittedBy":"advisor@example.com"}'
curl -X PUT http://localhost:5000/api/applications/<APPLICATION_ID>/complete \
  -H "Content-Type: application/json" \
  -d '{"completedBy":"closer@example.com"}'
curl -X DELETE http://localhost:5000/api/applications/<APPLICATION_ID>
```

### Documents

```bash
curl -X GET http://localhost:5000/api/documents
curl -X POST http://localhost:5000/api/documents \
  -H "Content-Type: application/json" \
  -d '{"applicationId":"<APPLICATION_ID>","type":"statement","filename":"statement.pdf","content":"base64-data"}'
curl -X PUT http://localhost:5000/api/documents/<DOCUMENT_ID>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
curl -X DELETE http://localhost:5000/api/documents/<DOCUMENT_ID>
```

### Lenders

```bash
curl -X GET http://localhost:5000/api/lenders
curl -X POST http://localhost:5000/api/lenders \
  -H "Content-Type: application/json" \
  -d '{"name":"Aurora Capital","contactEmail":"aurora@example.com","products":[{"name":"Aurora Prime","rate":5.1,"termMonths":48}]}'
curl -X PUT http://localhost:5000/api/lenders/<LENDER_ID> \
  -H "Content-Type: application/json" \
  -d '{"contactEmail":"new-contact@example.com"}'
curl -X GET http://localhost:5000/api/lenders/<LENDER_ID>/products
curl -X POST http://localhost:5000/api/lenders/<LENDER_ID>/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Aurora Flex","rate":4.2,"termMonths":60}'
curl -X POST http://localhost:5000/api/lenders/<LENDER_ID>/send \
  -H "Content-Type: application/json" \
  -d '{"applicationId":"<APPLICATION_ID>","notes":"Priority"}'
curl -X POST http://localhost:5000/api/lenders/reports \
  -H "Content-Type: application/json" \
  -d '{"lenderId":"<LENDER_ID>","rangeStart":"2024-01-01T00:00:00Z","rangeEnd":"2024-12-31T23:59:59Z"}'
curl -X DELETE http://localhost:5000/api/lenders/<LENDER_ID>/products/<PRODUCT_ID>
```

### Communication

```bash
curl -X GET http://localhost:5000/api/communication
curl -X POST http://localhost:5000/api/communication/sms \
  -H "Content-Type: application/json" \
  -d '{"to":"+123456789","message":"Hello"}'
curl -X POST http://localhost:5000/api/communication/email \
  -H "Content-Type: application/json" \
  -d '{"to":"client@example.com","subject":"Welcome","body":"Thanks for joining"}'
curl -X POST http://localhost:5000/api/communication/calls \
  -H "Content-Type: application/json" \
  -d '{"to":"+123456789","outcome":"answered","notes":"Great call"}'
curl -X DELETE http://localhost:5000/api/communication/<COMMUNICATION_ID>
```

### Marketing

```bash
curl -X GET http://localhost:5000/api/marketing/ads
curl -X POST http://localhost:5000/api/marketing/ads \
  -H "Content-Type: application/json" \
  -d '{"name":"Spring Push","channel":"facebook","budget":2500}'
curl -X DELETE http://localhost:5000/api/marketing/ads/<AD_ID>
curl -X GET http://localhost:5000/api/marketing/automation
curl -X PUT http://localhost:5000/api/marketing/automation/<AUTOMATION_ID> \
  -H "Content-Type: application/json" \
  -d '{"status":"disabled"}'
```

### Admin

```bash
curl -X GET http://localhost:5000/api/admin/retry-queue
curl -X POST http://localhost:5000/api/admin/retry-queue \
  -H "Content-Type: application/json" \
  -d '{"id":"<JOB_ID>"}'
curl -X DELETE http://localhost:5000/api/admin/retry-queue/<JOB_ID>
curl -X GET http://localhost:5000/api/admin/backups
curl -X POST http://localhost:5000/api/admin/backups \
  -H "Content-Type: application/json" \
  -d '{"scope":"full"}'
```

### Pipeline

```bash
curl -X GET http://localhost:5000/api/pipeline
curl -X GET http://localhost:5000/api/pipeline/stages
curl -X PUT http://localhost:5000/api/pipeline/stages/<STAGE_ID> \
  -H "Content-Type: application/json" \
  -d '{"name":"Underwriting"}'
curl -X POST http://localhost:5000/api/pipeline/assignments \
  -H "Content-Type: application/json" \
  -d '{"applicationId":"<APPLICATION_ID>","stageId":"<STAGE_ID>","ownerId":"<USER_ID>"}'
```

### Office 365

```bash
curl -X GET http://localhost:5000/api/office365/calendar
curl -X POST http://localhost:5000/api/office365/calendar \
  -H "Content-Type: application/json" \
  -d '{"title":"Review","start":"2024-08-01T10:00:00Z","end":"2024-08-01T11:00:00Z"}'
curl -X POST http://localhost:5000/api/office365/email \
  -H "Content-Type: application/json" \
  -d '{"to":"team@example.com","subject":"Sync","body":"Agenda"}'
curl -X GET http://localhost:5000/api/office365/tasks
curl -X POST http://localhost:5000/api/office365/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Follow up","dueDate":"2024-08-05T00:00:00Z"}'
```

### LinkedIn

```bash
curl -X GET http://localhost:5000/api/linkedin
curl -X POST http://localhost:5000/api/linkedin \
  -H "Content-Type: application/json" \
  -d '{"name":"Investor Outreach","steps":[{"order":0,"action":"connect","content":"Hi"}]}'
curl -X PUT http://localhost:5000/api/linkedin/<SEQUENCE_ID> \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Outreach"}'
curl -X DELETE http://localhost:5000/api/linkedin/<SEQUENCE_ID>
```

Replace placeholder identifiers (e.g., `<APPLICATION_ID>`) with IDs returned from previous calls. All endpoints are functional stubs backed by in-memory storage, so restarts reset state.
