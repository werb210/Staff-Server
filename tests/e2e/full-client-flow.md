# Full Client Flow Tests

Scenarios validating the client-facing application from onboarding through submission, including recovery flows.

## Step 1 KYC full cycle
- Validate identity form, document capture/upload, and verification callbacks.
- Confirm errors for invalid IDs and retry handling.

## Step 2 recommendation engine behavior
- Provide varied business profiles to ensure recommendations adjust products and messaging.

## Step 3 dynamic business questions
- Verify conditional questions render based on prior answers; ensure persistence across sessions.

## Step 4 dynamic applicant questions
- Validate applicant-specific branching logic and required field enforcement.

## Step 5 required docs logic
- Ensure document checklist updates based on business/applicant inputs and prevents advance until satisfied.

## Offline upload behavior
- Test offline or poor connectivity uploads queue locally and sync when online.

## AI chatbot tests
- Validate chatbot responds with contextual guidance and references application data.

## Talk-to-human path tests
- Trigger human handoff and confirm agent receives context and chat continuity.

## Report-issue path tests
- Submit issue; verify ticket creation and confirmation messaging.

## Submit → SignNow redirect flow
- Complete application and confirm redirect to SignNow package with correct parameters.

## Reset application test
- Trigger reset and ensure data clears while preserving account and audit trail.

## Token corruption recovery
- Simulate corrupted token and ensure re-authentication/refresh flows recover gracefully.

## Double submission prevention
- Attempt multiple submissions; verify backend idempotency and UI messaging preventing duplicates.
