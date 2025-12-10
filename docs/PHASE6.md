➝

📦 STAFF-SERVER — PHASE 6

OCR + Banking Analysis Engine Integration Block

Do not modify. Do not add commentary. Paste this entire block into Codex exactly as-is.

➝

🚀 STAFF-SERVER — PHASE 6

OCR ENGINE + BANKING ANALYSIS ENGINE + PIPELINE INTEGRATION

This block updates the Staff-Server to implement the OCR engine, banking analysis engine, and their integration with the application lifecycle, documents module, recommendation engine, and Sales Pipeline.

Codex must apply this block ONLY to the Staff-Server repository.

➝

1. OCR ENGINE (Azure-based)

Implement a provider-agnostic OCR engine with:

1.1 OCR Pipeline
•Deterministic request IDs
•Chunked PDF/JPEG/PNG processing
•OCR extraction with field categorization:
•Balance sheet fields
•Income statement fields
•Cash flow fields
•Tax fields
•Contract fields
•Invoice fields
•Always scan for these global fields:
•SIN / SSN
•Website URL
•Phone numbers
•Business legal name
•Email addresses
•Multi-document conflict detection:
•Same field appearing across documents
•Highlight mismatched values
•Include all values in output

1.2 OCR Storage
•Store OCR output in ocrResults table:
•applicationId
•documentId
•extracted JSON
•field category
•confidence scores
•timestamp

1.3 OCR Versioning
•Every OCR reprocessing creates a version record
•Link to document version ID
•Expose endpoint:
•POST /api/ocr/:documentId/reprocess

➝

2. BANKING ANALYSIS ENGINE

Implement a full banking-analysis pipeline.

2.1 Input Requirements
•6 months of bank statements (PDF or images)
•OCR-normalized transaction extraction
•Categorization:
•credits
•debits
•NSF events
•payroll
•transfers
•merchant deposits
•loan payments

2.2 Banking Metrics

Codex must generate metrics:
•Average monthly revenue
•Average monthly expenses
•Effective burn rate
•Days cash on hand
•6-month revenue trend
•NSF count
•Largest deposit patterns
•Volatility index

2.3 Banking Output Storage

Write to bankingAnalysis table:
•applicationId
•metrics JSON
•monthly breakdown JSON
•timestamp

2.4 Reprocessing

Add endpoint:
•POST /api/banking/:applicationId/reprocess

➝

3. PIPELINE INTEGRATION

3.1 Auto-triggering

When a document is uploaded, system must:
•Generate Azure Blob key
•Save document record
•Create document version
•Trigger OCR for:
•Financial statements
•Banking statements
•Trigger Banking Analysis if doc is a bank statement

3.2 Status Updates

After OCR + Banking complete:
•Application status updates:
•requires_docs → in_review
•in_review → depends on staff

3.3 Pipeline Timeline

Add timeline events for:
•OCR started
•OCR completed
•Banking analysis started
•Banking analysis completed
•Conflicting values detected

➝

4. DYNAMIC REQUIRED DOCUMENT SELECTION

The Staff-Server must:
1.Look at the selected productCategory
2.Look at all lender products in that category
3.Combine required document sets (union, not intersection)
4.Expose to Client App via:
•GET /api/products/required-docs?category=X

Client App will use these to build Step 5 upload list.

➝

5. APPLICATION CONTEXT ENGINE

Expand AI context engine with:
•OCR summaries
•Banking summaries
•Timeline events
•Document metadata
•Product-matched doc requirements
•All KYC + business info

Endpoint used by:
•Staff Portal
•AI Wizard
•Credit Summary Engine

➝

6. API ENDPOINTS TO ADD

POST /api/ocr/:documentId/reprocess
POST /api/banking/:applicationId/reprocess
GET  /api/products/required-docs
GET  /api/applications/:id/context

All must include:
•RBAC
•Input validation
•Audit logging

➝

7. TESTING REQUIREMENTS

Codex must generate integration tests for:

OCR
•Upload → OCR auto-trigger
•Reprocess endpoint
•Field matching + conflict detection
•OCR versioning

Banking
•Multi-month extraction
•Trend generation
•Reprocess endpoint

Pipeline
•Status transitions
•Timeline events
•Combined required-doc selection

AI Context
•Ensures everything resolves in one unified object

All tests must pass.

➝

END OF PHASE 6 BLOCK

Paste this entire block into Codex as-is.

➝
