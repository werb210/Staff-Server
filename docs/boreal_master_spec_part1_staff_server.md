# Boreal Master Specification (V1)

## Part 1 — Staff-Server (Engineering Spec)

### 1.0 Purpose of the Staff-Server
The Staff-Server is the core backend of the Boreal system. It:
- Accepts all Client App submissions
- Controls the entire Sales Pipeline
- Stores all applications, documents, timelines, and communications
- Runs the OCR + Banking Engine
- Generates the Credit Summary
- Stores and enforces all lender product rules
- Coordinates with the AI Wizard
- Powers the Staff Portal
- Powers the Lender Portal
- Hosts the SLF intake API
- Performs all audit logging
- Manages all communication flows (SMS, email, chat)

This server is the source of truth for all data in the Boreal ecosystem.

---

### 2.0 High-Level Architecture

#### 2.1 Components (Best Practice Micro-Modular Monolith)
- Express.js API
- PostgreSQL (Azure Database for PostgreSQL)
- Blob Storage (Azure Storage)
- OCR Engine (triggered services / Lambdas in future)
- Banking Analysis Engine (internal module)
- Document Integrity Engine
- Dynamic Lender Product Engine
- AI Wizard Context Engine
- Communication Engine
- Pipeline Engine
- Event Logging + Audit Engine
- Lender Portal API
- SLF Silo Intake API

#### 2.2 Services Boundaries

| Service             | Responsibility                       |
| ------------------- | ------------------------------------ |
| Client Application  | Sends data & documents               |
| Staff-Server        | Central intelligence + storage       |
| Staff Portal        | UI consumer of Staff-Server          |
| Lender Portal       | Manages lender products & docs       |
| SLF Server          | External intake feeding into Staff-Server |
| AI Wizard           | Uses context from Staff-Server        |
| SignNow             | Final document signing                |

---

### 3.0 Authentication & Authorization

#### 3.1 User Types
- Admin
- Staff
- Lender
- Referrer (V2 placeholder)
- Applicant (Client App)

#### 3.2 Authentication
- JWT access tokens
- Refresh tokens (httpOnly)
- 2FA for Lenders and Admins
- SMS OTP for Client Portal login
- API keys for SLF ingestion

#### 3.3 Authorization Matrix

| Role    | Permissions                                                    |
| ------- | -------------------------------------------------------------- |
| Admin   | Full system access                                             |
| Staff   | CRM, Pipeline, Lenders, Communications, Calendar, Tasks        |
| Lender  | Own products + company info only                               |
| Applicant | Own application only                                         |
| SLF API | Create/update SLF applications                                 |

---

### 4.0 Database Schema (PostgreSQL)

#### 4.1 applications
Stores the entire lifecycle of a client loan application.

Fields:
- id (uuid)
- silo ("BF" | "SLF" | "BI")
- external_id (string | null) (for SLF imports)
- status (enum)
- new
- requires_docs
- start_up
- review
- lender
- accepted
- declined
- step_progress (int)
- product_categories (string[])
- business_data (jsonb)
- applicant_data (jsonb)
- partner_data (jsonb | null)
- dynamic_questions (jsonb)
- required_documents (jsonb)
- credit_summary_path (string | null)
- signed_application_path (string | null)
- created_at
- updated_at

Indexes:
- silo + status
- external_id
- product_categories GIN index

#### 4.2 documents
Stores all document references from any application.

Fields:
- id (uuid)
- application_id (uuid)
- category (enum|string)
- file_name (string)
- mime_type (string)
- size_bytes (int)
- blob_path (string)
- sha256_checksum (string)
- version (int)
- status ("uploaded" | "accepted" | "rejected")
- rejection_reason (string | null)
- created_at
- updated_at

#### 4.3 contacts
Primary CRM contact.

Fields:
- id (uuid)
- first_name
- last_name
- email
- phone
- country
- created_at

#### 4.4 companies
CRM company.

Fields:
- id (uuid)
- legal_name
- trade_name
- address (jsonb)
- country
- employees
- website
- created_at

#### 4.5 lenders
Fields:
- id (uuid)
- company_name
- country
- contact_info (jsonb)
- is_active (bool)
- created_at

#### 4.6 lender_products
Fields:
- id (uuid)
- lender_id (uuid)
- product_name (string)
- category (enum)
- working_capital
- term_loan
- loc
- factoring
- po_finance
- equipment_finance
- startup_capital (V2)
- min_amount (int)
- max_amount (int)
- commission_percent (numeric)
- required_documents (jsonb)
- required_questions (jsonb)
- application_template_path (string | null)
- is_active (bool)
- created_at

#### 4.7 chat_messages
Stores AI + human + applicant messages.

Fields:
- id (uuid)
- application_id (uuid)
- sender ("ai" | "user" | "staff")
- content (text)
- metadata (jsonb)
- created_at

#### 4.8 issues
Stores "report an issue" submissions.

Fields:
- id (uuid)
- application_id (uuid)
- description (text)
- priority (enum)
- status (enum)
- created_at

#### 4.9 audit_logs
Everything mutated is recorded here.

Fields:
- id (uuid)
- action (string)
- user_id (uuid | null)
- application_id (uuid | null)
- context (jsonb)
- created_at

#### 4.10 slf_imports
SLF API ingestion.

Fields:
- id (uuid)
- external_id (string)
- payload (jsonb)
- documents (jsonb)
- status
- created_at

---

### 5.0 Document Engine

#### 5.1 Upload Pipeline
1. Receive file
2. Validate MIME and size
3. Compute SHA-256
4. Store in Azure Blob
5. Create DB entry
6. Send OCR trigger
7. Versioning if replacing older file
8. Update pipeline stage rules

#### 5.2 Folder Structure

```
/documents/{application_id}/
   originals/
   processed/
   versions/
   signed/
   credit-summary/
```

#### 5.3 Version Control
- Every upload creates a new version
- Older versions remain accessible
- Re-review triggers new OCR

#### 5.4 Integrity Rules
- Do not delete files unless DB record removed
- Do not remove DB unless file missing
- Daily audit (cron) checks Blob consistency

---

### 6.0 Pipeline Engine

#### 6.1 Stages (BF Silo)
- new
- requires_docs
- start_up
- review
- lender
- accepted
- declined

#### 6.2 Stage Triggers

| Condition                      | Move To        |
| ------------------------------ | -------------- |
| Application created            | new or start_up |
| Any required doc missing       | requires_docs  |
| Any doc rejected               | requires_docs  |
| All docs uploaded & accepted, staff opens card | review |
| Staff selects lender → submit  | lender         |
| Lender accepts                 | accepted       |
| Lender declines                | declined       |

No staff drag/drop needed for required stage movement.

---

### 7.0 OCR Engine
- Triggered on upload
- Extract tables, values
- Extract balance sheet, income statement, cash flow
- Extract AR/AP aging
- Extract fields from documents
- Map to financial_data
- Populate AI training context
- Feed banking analysis

---

### 8.0 Banking Analysis Engine
- Detect daily balances
- Calculate average daily balance
- Detect NSFs
- Detect negative days
- Detect deposit consistency
- Output structured metrics
- Feed pipeline + AI
- Output used in Credit Summary

---

### 9.0 Credit Summary Engine

When it generates:
- When ALL docs accepted
- When ANY doc replaced

Output:
- PDF stored in /credit-summary/ folder
- Data sourced from:
  - Step 1–4 answers
  - OCR
  - Banking Analysis
  - Business info
  - Applicant info
  - AR/AP
  - Website scrape (AI)
- Staff Portal card tab displays PDF viewer

---

### 10.0 Communication Engine

#### 10.1 Chat Endpoints
- POST /applications/:id/chat
- GET /applications/:id/chat

#### 10.2 Report an Issue
- POST /applications/:id/issues

#### 10.3 SMS (Twilio)
- Daily reminders for missing docs
- Status updates

#### 10.4 Email (SendGrid/O365)
- Status updates
- Reminders

---

### 11.0 AI Wizard Integration

#### 11.1 Context Endpoint
- GET /applications/:id/ai-context

Returns:
- All answers
- All dynamic questions
- All dynamic documents
- All lender product rules
- All OCR + banking results
- Timeline context

#### 11.2 Logging
- POST /applications/:id/ai-log

---

### 12.0 Lender Portal API
Manage lender info

Manage lender products

Upload application templates

Manage required docs

Endpoints:
- GET /lenders/me/products
- POST /lenders/me/products
- PATCH /lenders/me/products/:id

---

### 13.0 SLF Integration
SLF Pushes:
- Application
- Documents
- Updates

Mapped into:
- applications
- documents
- timelines

Silo isolation enforced.

---

### 14.0 Error Handling

Standardized error format:

```json
{
  "error": {
    "code": "INVALID_FIELD",
    "message": "Email is required."
  }
}
```

Retries built into:
- Doc upload
- OCR
- Chat delivery
- SLF import

---

### 15.0 Security & Audit
- All PII encrypted at rest
- All document storage private
- All staff actions logged
- All AI messages logged
- All lender portal actions logged

---

### 16.0 Endpoint Catalog
(Delivered in full in the final consolidated version)

---

### 17.0 Test Plan

Unit tests:
- Application creation
- Document intake
- OCR parsing
- Pipeline transitions

Integration tests:
- Staff Portal → Staff-Server
- Client → Staff-Server
- Lender Portal → Staff-Server

E2E tests:
- Full application flow
- Document versions
- Credit summary generation

---

🟦 Part 1 complete
