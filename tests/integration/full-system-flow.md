# Full System Flow Tests

This document outlines end-to-end integration scenarios for the Staff-Server service. Each section lists required setup, execution steps, and validation points to ensure system health without modifying production data.

## API health checks
- Verify `/health` and `/status` endpoints return HTTP 200 with expected payload keys (uptime, version, database connectivity).
- Confirm authentication middleware does not block health endpoints.

## Application creation test
- POST to application creation endpoint with valid payload.
- Validate response contains new application ID and tenant/silo metadata.
- Confirm record persisted in database with correct default status and timestamps.

## Document upload → storage → DB record validation
- Upload sample document via authenticated request.
- Ensure storage layer receives file and returns storage key.
- Check database record stores storage key, document type, uploader, and checksum.
- Validate retrieval endpoint returns signed URL referencing the stored file.

## OCR trigger validation
- After document upload, confirm OCR job enqueued with correct document ID and storage path.
- Validate OCR callback updates document metadata with extracted text and status.

## Banking analysis trigger validation
- Submit banking connection or statement upload.
- Verify banking analysis job is queued with tenant context and application ID.
- Confirm analysis results are written to database and linked to application.

## Sales pipeline automation test
- Create application and trigger pipeline stage transitions via events.
- Validate automation rules move application across stages and record audit entries.
- Confirm notifications or webhooks fire for configured transitions.

## Lender product retrieval test
- Request lender products for an application profile.
- Ensure filtering uses applicant attributes and silo constraints.
- Validate response includes quotas, eligibility notes, and match percentages.

## Send-to-lender test including payload format
- Trigger send-to-lender action for a selected product.
- Capture outbound payload and confirm required fields: applicant data, financial summaries, documents, and consent flags.
- Validate status updates to "Sent" and logs external correlation ID.

## SignNow initiation test
- Initiate SignNow package creation for required documents.
- Verify request payload includes signers, document IDs, and callback URLs.
- Confirm SignNow returns package ID and status stored in DB.

## SignNow callback test
- Simulate SignNow callback (success and failure paths).
- Ensure system updates signature status, stores signed document URLs, and logs timeline entries.

## Document re-mounting test
- For signed documents, request remount/re-ingest into storage.
- Validate new storage key recorded and old links are archived.

## CRM timeline entry creation for all events
- Confirm every major event (creation, upload, OCR completion, banking analysis, send-to-lender, SignNow callbacks) writes timeline entries with timestamps and user/system attribution.

## AI chatbot message routing tests
- Send chatbot queries related to applications and documents.
- Validate routing to appropriate intents and system responses include source data references.

## Talk-to-human routing tests
- Initiate transfer from chatbot to human agent.
- Confirm session handoff is logged and agent receives context.

## Report-an-issue routing tests
- Submit issue via chatbot flow.
- Verify issue ticket created with application context and timeline entry added.
