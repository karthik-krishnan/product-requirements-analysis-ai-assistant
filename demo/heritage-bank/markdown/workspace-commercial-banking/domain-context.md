# Heritage Bank — Commercial Banking Team: Domain Context

## Team Scope

The Commercial Banking Team owns the **SMB Business Portal** serving Heritage's 85,000 business banking clients. The team covers multi-user business account access, ACH payroll origination, commercial wire transfers (with dual authorization), and the transaction monitoring feed to NICE Actimize for AML compliance.

---

## Team Personas

| Persona | Description | Key Needs |
|---|---|---|
| **SMB Owner** | Primary business account holder; full access to all portal features | Multi-account dashboard, ACH payroll, wire initiation, add/manage users |
| **SMB Authorized User — Viewer** | Employee granted read-only access by the SMB Owner | Balance and transaction history; no payment initiation |
| **SMB Authorized User — Initiator** | Employee who can create and submit payments but not approve them | ACH batch creation, wire initiation; requires a separate Approver to release |
| **SMB Authorized User — Approver** | Employee who can approve and release payment batches initiated by others | Review and release ACH batches and wires; cannot be the same person as the Initiator on any transaction |
| **Branch Manager** | Heritage staff who manages the SMB relationship at branch level | Account opening authority; override holds; relationship-level dashboards |
| **Compliance Officer** | Monitors commercial account activity for BSA/AML | SAR filing, CTR generation, audit trail access |

**Key dual-authorization rule**: On any single transaction, the Initiator and Approver must be **different individuals**. The portal must enforce this at the data layer — not just the UI.

---

## SMB Account Types & Features

- **Business Checking / Business Savings**: multi-signatory; ACH origination enabled by default
- Multi-account dashboard: SMB Owner sees all business accounts in a single consolidated view
- Account statements: downloadable PDF; 24-month history online; older on request
- User management: SMB Owner can add employees as Viewer, Initiator, or Approver; roles are per-account, not per-portal (an employee can be Initiator on Account A and Viewer on Account B)

---

## ACH Payroll & Batch Payments

- SMB businesses originate ACH payroll via **NACHA-format file upload** or a manual batch entry UI
- **ACH batch lifecycle**: Draft → Submitted → Awaiting Approval → Approved → Sent to FedACH → Settled / Returned
- **Dual authorization threshold**: ACH batches above $25,000 require Initiator + Approver; below $25,000 can be self-approved by the SMB Owner
- **Return handling**: ACH returns (R02 invalid account, R10 unauthorized, etc.) arrive at 10 AM or 2 PM CT via FedACH; displayed in the portal within 30 minutes of BIH processing; SMB is notified via email
- **Cut-off times**: same-day ACH (SDIE): 2:30 PM CT; next-day ACH: 8 PM CT — the portal enforces these cut-offs and marks late submissions as next-business-day

### NACHA File Validation
- The portal validates NACHA files on upload before submitting to BIH: record count, hash total, company ID, effective date
- Validation errors are displayed inline with row-level detail (e.g., "Row 14: invalid routing number 021999999")
- Files passing validation are stored in S3; submitted to BIH which queues them for AS/400 ACH module during the appropriate window

---

## Wire Transfers (Commercial)

- SMB clients can initiate domestic (Fedwire) and international (SWIFT) wire transfers via the portal
- **Dual authorization**: all commercial wires (any amount) require a separate Approver; the Wire Desk reviews wires above $10,000 before release to Fedwire/SWIFT
- **Wire Desk review**: wires above $10,000 go into a Wire Desk queue; a Heritage wire operations specialist manually approves before release (typically within 2 hours for domestic, 4 hours for international)
- **Wire cutoffs**: domestic Fedwire: 5:00 PM CT; international SWIFT: 3:00 PM CT
- **Wire templates**: SMB Owners can save beneficiary details as named wire templates; prevents re-entry errors for recurring wires

---

## Fraud & AML (Commercial)

- **NICE Actimize** receives a real-time Kafka event stream of all commercial transactions (ACH, wire, RTP, internal transfer)
- Actimize flags suspicious activity and creates cases that Compliance Officers review in the Actimize workbench (separate from the Heritage portal)
- **CTR (Currency Transaction Reports)**: auto-generated for cash deposits or withdrawals ≥ $10,000 in a single day; submitted via FinCEN BSA E-Filing
- **SAR (Suspicious Activity Reports)**: Compliance Officer files SARs via the Actimize workbench; triggered by Actimize case + Compliance Officer approval
- **Velocity limits**: configurable per business account (e.g., max ACH credit $100,000/day; max single wire $500,000)

---

## Business Rules Specific to Commercial

1. **Dual authorization is enforced at the Payment Service level** — an Initiator cannot approve their own transaction even if they hold both roles on different accounts; the system enforces by `userId` comparison, not role lookup
2. ACH file cut-off times are enforced by the Transfer Service (not AS/400); late submissions are rejected with a clear cut-off message
3. Commercial wires above **$10,000** always enter the Wire Desk review queue regardless of dual-auth status
4. NACHA file validation errors must be reported at the **row level** (not just "file invalid") so the SMB can correct specific rows
5. ACH returns must appear in the portal within **30 minutes** of BIH processing the FedACH return file
6. An SMB Authorized User with Initiator role can **never** also be the Approver on the same batch or wire — this is enforced server-side by `initiatedBy` ≠ `approvedBy` check before processing
