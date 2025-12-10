# Full UI Flow Tests

These UI scenarios cover critical navigation and interaction paths in the Staff Portal. Execute in each silo (BF, BI, SLF) with appropriate test accounts.

## Login & MFA validation
- Validate login form renders and rejects invalid credentials.
- Confirm MFA prompt appears and accepts valid OTP, rejecting expired codes.

## Silo switching test (BF / BI / SLF)
- Switch between silos and confirm branding, data segregation, and URL context update.
- Ensure cached data clears when silo changes.

## Dashboard render test
- Verify widgets load (pipeline counts, tasks, alerts) and reflect silo-specific data.
- Confirm performance metrics load within acceptable time.

## Sales pipeline column tests
- Ensure columns render per configuration and support drag-and-drop between stages.
- Validate stage counters update and audit logs capture movement.

## Application card tab tests
### Application Data
- Confirm applicant details render and edits persist with validation errors displayed inline.

### Banking / Flinks
- Validate banking connection status, statement imports, and refresh actions.
- Ensure error states surface actionable messaging.

### Financial Data
- Confirm financial tables populate, calculations match backend, and exports succeed.

### Documents
- Verify document list, preview, download, and upload controls respect permissions.

### Notes conversation
- Test threaded comments, mentions, and timeline linkage.

### Credit Summary PDF generation
- Trigger PDF generation and confirm download includes updated data and branding.

### Lenders table + quotas + match %
- Validate lender rows, quota indicators, match percentages, and filtering.

## Document preview & download
- Open previews for multiple file types and confirm rendering/annotations work.
- Download documents and validate checksum or size matches backend record.

## Document accept/reject tests
- Approve and reject documents with reasons; verify status changes and timeline entries.

## Communication Center tests
- Send and receive SMS, email, and voice actions; confirm transcripts/logs appear.
- Validate AI/chatbot assistance shows suggested replies when enabled.

## CRM Contact tests (timeline, calls, SMS, email)
- Create/update contacts; ensure timeline entries record communications and tasks.

## Marketing Tab tests
- Validate campaign lists, enrollment actions, and attribution metrics.

## Lender Portal tests
- Confirm embedded lender portal loads, respects access control, and displays lender-specific data.

## Settings page tests
- Verify role-based access to settings; test changes to notifications, templates, and integrations with save/rollback paths.
