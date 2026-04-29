# Requirements Prompt — Heritage Bank Commercial Banking Team

## How to use this file

1. In ProductPilot, go to **Settings → Enterprise Context** and paste `enterprise/enterprise-domain-context.md` into the Domain Context field. Paste `enterprise/enterprise-tech-context.md` into the Tech Context field.
2. Select or create the **Commercial Banking** workspace. Paste `workspace-commercial-banking/domain-context.md` into its Domain Context field and `workspace-commercial-banking/tech-context.md` into its Tech Context field.
3. Copy the requirements text below and paste it into the **Requirements Intake** screen.

---

## Requirements Text (paste this)

```
Build Heritage Bank's SMB Business Portal — a commercial banking platform for 85,000 business banking
clients covering multi-user account access, ACH payroll origination, and commercial wire transfers.

All commercial account data flows through the Banking Integration Hub (BIH) to the IBM AS/400 (FiServ
Precision) core banking system. No changes are made to AS/400 COBOL or RPG code.

Scope for this initiative:

1. MULTI-USER BUSINESS ACCOUNT ACCESS
   - SMB Owner sees all business accounts (Checking, Savings) in a consolidated dashboard
   - Account balances (real-time available balance from FiServ API), 24-month transaction history, statement PDF download
   - User management: SMB Owner invites employees and assigns roles per account: Viewer, Initiator, or Approver
   - Role constraint: a user cannot be both Initiator and Approver on the same transaction (enforced server-side, not just UI)
   - Roles are per-account: an employee can have different roles on different accounts

2. ACH PAYROLL & BATCH PAYMENTS
   - NACHA-format file upload for ACH payroll origination (max 50 MB file; up to 10,000 rows)
   - Row-level NACHA validation (record count, batch hash total, routing numbers, effective date) — errors reported per row, not just "file invalid"
   - Manual batch entry UI as an alternative to file upload
   - ACH batch lifecycle: Draft → Submitted → Awaiting Approval → Approved → Sent to FedACH → Settled / Returned
   - Dual authorization: batches above $25,000 require separate Initiator + Approver; below $25,000 can be self-approved by SMB Owner
   - Cut-off enforcement: same-day ACH (SDIE) 2:30 PM CT; next-day ACH 8 PM CT — portal rejects late submissions with explicit cut-off message
   - ACH return handling: R-code returns (R02, R10, etc.) displayed in portal within 30 minutes of BIH processing; email notification to SMB Owner
   - Operations queued around AS/400 batch windows (midnight–4 AM CT, 6 PM CT EOD)

3. WIRE TRANSFERS
   - Wire initiation: domestic Fedwire and international SWIFT
   - All commercial wires require dual authorization (Initiator + separate Approver) regardless of amount
   - Wires above $10,000 enter Wire Desk review queue; Heritage wire operations specialist releases within 2 hours (domestic) / 4 hours (international)
   - Wire cutoffs: domestic Fedwire 5:00 PM CT; international SWIFT 3:00 PM CT
   - Wire templates: save beneficiary details as named templates for recurring wires

4. FRAUD & COMPLIANCE MONITORING
   - All ACH batch and wire events published to Kafka → NICE Actimize for real-time AML monitoring
   - Actimize fraud alerts immediately pushed to SMB Owner (push + email) and Compliance Officer
   - Currency Transaction Reports (CTRs): auto-generated for cash transactions ≥ $10,000 — visible to Compliance Officer in audit trail
   - Configurable velocity limits per business account (e.g., max ACH credit $100,000/day)

5. NOTIFICATIONS & ALERTS
   - ACH return notifications (same day; R-code and description displayed)
   - Wire status updates (submitted, in Wire Desk review, released to Fedwire, settled, rejected)
   - Low balance alerts (SMB Owner sets threshold per account)
   - Fraud alerts from Actimize (immediate)
   - All notifications via email; push for SMB Owner mobile sessions

Platform integrations: BIH → AS/400 (FiServ Open Solutions REST + IBM MQ), FedACH (via AS/400 ACH module),
Fedwire / SWIFT (via BIH), NICE Actimize (Kafka + webhook), Okta (identity), Amazon S3 (NACHA file storage),
Salesforce Financial Services Cloud (user grant sync).

Phase 1 (12 months): multi-user account access, ACH batch (file upload + manual entry), dual-auth workflow, ACH returns, wire initiation with Wire Desk review, Actimize integration.
Phase 2 (months 13–18): velocity limit management, RTP for commercial, SMB account opening, advanced analytics (cash flow forecasting, payroll history trend).
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Dual-auth enforcement | Server-side: `initiatedBy` ≠ `approvedBy` checked before BIH submission; HTTP 403 if violated; UI also prevents it but server is authoritative |
| NACHA validation | Row-level JSON error array returned synchronously; file rejected and not submitted to BIH until all errors resolved |
| ACH cut-offs | Enforced by the ACH Batch Service (not AS/400); late submissions rejected with explicit message and next-available-window estimated time |
| Wire Desk workflow | Wires > $10K auto-queued for Wire Desk; separate internal Wire Desk tool for Heritage staff to review and release; SLA 2h domestic / 4h international |
| Role model | Roles are account-scoped, stored in User Management Service; Okta carries role claims in JWT; services validate claims against User Management Service DB |
| Actimize integration | Kafka producer on all payment events; Actimize on-prem consumes; Actimize sends alert webhook back to Commercial Notification Service |
| Phasing | Phase 1 (12 months): account access, ACH (file + manual), dual-auth, wire initiation, Actimize; Phase 2: velocity limits, RTP, account opening, analytics |
