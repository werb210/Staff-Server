Below is the full, authoritative SYSTEM_CONTRACT.md for the Staff Server.
This is the single source of truth for how the system behaves.
Nothing outside this document is allowed to contradict it.

⸻

SYSTEM_CONTRACT.md

Boreal Financial — Staff Server

1. Purpose

This document defines the immutable system rules governing:
	•	Applications
	•	Lenders
	•	Lender Products
	•	Required Documents
	•	Sales Pipeline
	•	Commissions
	•	Client ↔ Staff interaction boundaries

This contract ensures:
	•	Predictable behavior
	•	Auditability
	•	No retroactive rule changes
	•	Safe future extensibility

⸻

2. Core Entities

2.1 Client
	•	Identified exclusively by phone number
	•	OTP authentication only
	•	Same phone number = same client profile
	•	One client may have multiple applications

⸻

2.2 Application

Represents a single funding request.

Key rules:
	•	Immutable ID
	•	One application = one product category
	•	Applications move through fixed pipeline stages
	•	Applications may return to earlier stages (e.g. Documents Required)

⸻

2.3 Lender

Represents a funding institution.

Lender rules:
	•	Lender is administrative only
	•	Lender country = head office location (informational)
	•	Lender does NOT control funding availability
	•	Submission method defined at lender:
	•	EMAIL or API
	•	Lender contains:
	•	Name
	•	Primary contact
	•	Submission email (if EMAIL)
	•	API configuration (if API)
	•	Active flag

Lenders can exist without products, but cannot fund without products.

⸻

2.4 Lender Product

Represents a specific funding offering.

This is the most important entity in the system.

Lender Products define:
	•	Funding rules
	•	Eligibility
	•	Required documents
	•	Commission model

A lender may have multiple products.

⸻

3. Sales Pipeline (Authoritative)

The pipeline has exactly these stages, in this order:
	1.	Received
	2.	Documents Required
	3.	In Review
	4.	Startup (conditional, see below)
	5.	Off to Lender
	6.	Accepted
	7.	Declined

Startup Stage Rules
	•	Startup is not always active
	•	Startup appears only if:
	•	A lender product exists with product_type = STARTUP
	•	No hardcoded logic
	•	Purely product-driven

⸻

4. Matching Logic (Critical)

4.1 Matching Dimensions

Lender Products are matched using:
	1.	Country
	2.	Amount Range
	3.	Product Category

Lender location is never used for matching.

4.2 Multiple Matches
	•	One application may match multiple lender products
	•	One lender may contribute multiple products
	•	All matching products participate in document aggregation

⸻

5. Required Documents (Critical)

5.1 Ownership
	•	Required documents are defined ONLY on LENDER PRODUCTS
	•	Never on lenders
	•	Never on applications

5.2 Aggregation Rule

For a given application:
	1.	Identify all matching lender products
	2.	Aggregate all required documents
	3.	De-duplicate by document type
	4.	Present full list to client (Step 5)

5.3 Global Rule
	•	ALL applications require 6 months of bank statements
	•	This applies regardless of product or lender
	•	Until FLINKS is introduced

5.4 Document Lifecycle
	•	Documents can be:
	•	Uploaded
	•	Rejected
	•	Re-uploaded
	•	Rejection moves application back to Documents Required
	•	Client receives notifications until complete

5.5 Extensibility
	•	New document types can be added safely
	•	Does not affect accepted applications
	•	Only applies to pending/new applications

⸻

6. Client Application Flow (Locked)
	1.	KYC / Initial Questions
	2.	Product Category Selection
	3.	Business Information
	4.	Applicant & Partner Info
	5.	Required Documents
	•	Upload now OR skip
	6.	Terms & Typed Signature

After submission:
	•	Client enters Client Portal
	•	Status updates are real-time
	•	Messaging persists

⸻

7. Authentication Rules

Client
	•	OTP only
	•	Re-auth required every visit
	•	Same phone = same profile

Staff
	•	Role-based
	•	Admin / Staff / Lender / Referrer
	•	O365 integration supported

⸻

8. Communications

Channels
	•	Email (O365)
	•	SMS (Twilio)
	•	Chat (Client Portal + Staff Portal)
	•	Issues (read-only, admin)

Rules
	•	One global thread per channel per client
	•	Chat is bi-directional
	•	Issues are one-way (client → staff)
	•	Aggregated notifications supported

⸻

9. Commission Model (Admin-Only)

9.1 Location
	•	Commission is defined ONLY on LENDER PRODUCTS

9.2 Type
	•	Profit Share
	•	Fixed % of top-line revenue earned by lender
	•	Independent of deal size

9.3 Timing
	•	Non–profit share: on close
	•	Profit share: monthly

9.4 Snapshot Rule (Critical)
	•	Commission terms are snapshotted
	•	Snapshot occurs when application enters Accepted
	•	Snapshot is immutable
	•	Future edits do NOT affect accepted applications

9.5 Visibility
	•	Admin-only
	•	Not visible to clients or lenders

⸻

10. Acceptance & Freeze Rules

When an application is Accepted:
	•	Lender product
	•	Required documents
	•	Commission terms
	•	Submission configuration

→ ALL frozen permanently

⸻

11. Client Portal Behavior
	•	Status timeline reflects pipeline changes
	•	Chat is always visible
	•	Document requests push notifications
	•	Client may re-upload indefinitely until accepted

⸻

12. System Guarantees

This system guarantees:
	•	No retroactive rule changes
	•	Full auditability
	•	Deterministic behavior
	•	Safe future expansion (FLINKS, syndication, AI agents)

⸻

13. Non-Goals (Explicitly Out of Scope)
	•	Dynamic commission recalculation
	•	Deal-size–based commission tiers
	•	State/province-level eligibility
	•	Client-visible commission logic

⸻

14. Contract Authority

If any code, UI, test, or migration conflicts with this document:

➡️ The code is wrong.
➡️ This document wins.

⸻

END OF SYSTEM CONTRACT
