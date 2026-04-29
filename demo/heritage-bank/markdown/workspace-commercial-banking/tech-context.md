# Heritage Bank — Commercial Banking Team: Technology Context

## Services Owned by This Team

| Service | Responsibility | Technology |
|---|---|---|
| **Commercial Account Service** | Multi-account dashboard, balance aggregation, statement retrieval for business accounts | Spring Boot 3.2 → BIH → AS/400 |
| **ACH Batch Service** | NACHA file upload, validation, dual-auth workflow, BIH submission, return handling | Spring Boot 3.2 + S3 + IBM MQ |
| **Wire Service** | Wire initiation, template management, Wire Desk review queue, Fedwire/SWIFT submission via BIH | Spring Boot 3.2 → BIH → AS/400 |
| **User Management Service** | SMB user invitation, role assignment (Viewer/Initiator/Approver), per-account role model | Spring Boot 3.2 + PostgreSQL |
| **Commercial Notification Service** | ACH return alerts, wire status updates, low balance alerts for business accounts | Spring Boot 3.2 + SES + Twilio |

## Frontends Owned by This Team

| Client | Technology | Notes |
|---|---|---|
| **SMB Business Portal** | React 18 SPA (TypeScript) + Apollo Client | Okta session-based auth; role-based UI rendering (Viewer/Initiator/Approver); hosted on CloudFront |
| **Wire Desk Internal Tool** | React 18 SPA (internal, mTLS) | Heritage Wire Desk staff; review queue, release and reject controls; Okta SAML auth |

---

## Key Technical Constraints

### Dual Authorization Enforcement
- The dual-auth rule (`initiatedBy` ≠ `approvedBy`) is enforced in the **ACH Batch Service and Wire Service** before submitting to BIH — not just in the UI
- User roles are stored in the User Management Service; each role grant is scoped to a specific account ID
- The API checks: (1) requester holds Approver role for this account, AND (2) `approvedBy` ≠ `initiatedBy` on the specific record
- Any attempt to approve one's own transaction returns HTTP 403 with a clear error message

### NACHA File Processing
- NACHA files uploaded to S3 (pre-signed URL, max 50 MB)
- ACH Batch Service fetches from S3 and validates synchronously: record count, batch hash total, company ID format, effective date (must be a banking business day), routing number format per row
- Row-level errors returned as a structured JSON array: `[{ "row": 14, "field": "routingNumber", "error": "Invalid ABA routing number" }]`
- Validated files are stored in S3 (immutable, 7-year retention); metadata record written to PostgreSQL

### AS/400 Batch Window (Commercial Impact)
- ACH files submitted after the cut-off but within the batch window are queued in IBM MQ; BIH processes them first thing when the window closes
- Wire initiation requests during batch window are queued; Wire Desk review can still proceed during the window; release to Fedwire/SWIFT is queued until after the window

### Actimize Integration
- All commercial payment events (`ach.batch.submitted`, `wire.initiated`, `wire.released`, `transfer.initiated`) published to Kafka
- Actimize on-prem system has a Kafka consumer group subscribed to these topics
- Actimize alert payload returned via a separate REST webhook to the Commercial Notification Service; triggers immediate push + email to SMB Owner and Compliance Officer

---

## External Integrations (this team)

| Integration | Protocol | Direction | Notes |
|---|---|---|---|
| **BIH → AS/400** | FiServ REST + IBM MQ | ACH/Wire Service → BIH → AS/400 | ACH file submission, wire release, balance queries |
| **FedACH (via BIH)** | NACHA format via AS/400 ACH module | ACH Batch Service → BIH → FedACH | ACH origination and return processing |
| **Fedwire / SWIFT (via BIH)** | Fedwire XML / SWIFT MT103 | Wire Service → BIH → Fedwire/SWIFT | Domestic and international wire transmission |
| **NICE Actimize** | Kafka (producer) + REST webhook (consumer) | Commercial services → Actimize; Actimize → Alert Service | Real-time transaction feed; fraud alert ingestion |
| **Okta** | OIDC + SAML | SMB Portal + Wire Desk Tool ← Okta | Auth; MFA; role-based access claims |
| **Amazon S3** | HTTPS (pre-signed URL) | SMB Portal → S3; ACH Batch Service ← S3 | NACHA file upload and secure storage |
| **Salesforce Financial Services Cloud** | REST API | User Management Service → Salesforce | New user grants and relationship events synced to Salesforce CRM |

---

## Non-Functional Requirements (this team)

| Category | Requirement |
|---|---|
| **NACHA validation** | Row-level error reporting; validation must complete within 10 seconds for files up to 10,000 rows |
| **Dual-auth enforcement** | Server-side check (not just UI); 403 response with error detail if violated |
| **ACH return visibility** | Returns appear in portal within 30 minutes of BIH processing the FedACH return file |
| **Wire Desk SLA** | Domestic wires: reviewed within 2 hours; international SWIFT: reviewed within 4 hours |
| **Cut-off enforcement** | Same-day ACH: 2:30 PM CT; next-day ACH: 8 PM CT; domestic Fedwire: 5 PM CT; SWIFT: 3 PM CT — enforced by the service, not AS/400 |
| **Audit logging** | Every ACH batch and wire action (create, submit, approve, reject, release) logged to Audit Service with `userId`, `accountId`, `amount`, `timestamp` |
| **Availability** | 99.9% for ACH Batch and Wire Services during business hours (7 AM–7 PM CT); planned maintenance in batch windows only |
