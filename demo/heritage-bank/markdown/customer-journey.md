# Heritage Bank Digital — Customer & Operator Journey Map

**Document type**: UX Research / Business Analysis  
**Version**: 2.0  
**Owner**: Heritage Digital Programme — Product Management

---

## Overview

This document maps the primary journeys for retail and SMB customers, and the branch teller who supports them, across Heritage Bank's modernised digital channels. All journeys route through the Banking Integration Hub (BIH) to the IBM AS/400 core; the AS/400 remains the system of record throughout.

---

## Journey 1 — Retail Customer: Check Balance and Transfer Funds

### Persona: Carol, 58, long-standing Heritage customer; not tech-savvy but comfortable with mobile banking

**Goal**: Check her savings balance and move $500 to her checking account before a bill payment clears.

| Step | Action | Service | Detail |
|------|--------|---------|--------|
| 1 | Opens Heritage mobile app; FaceID login | Identity Service (Okta + biometric) | OIDC PKCE flow; biometric as 2nd factor |
| 2 | Dashboard loads: all account summaries | Account Service → BIH → AS/400 | Available balance shown (not book balance) |
| 3 | Taps "Move Money" → selects savings-to-checking | Payment Service | — |
| 4 | Enters $500; reviews and confirms | Payment Service | — |
| 5 | Transfer posts immediately; balance updates | Payment Service → BIH → FiServ API | AS/400 books transaction; available balance refreshed |
| 6 | Push notification: "Transfer of $500 complete" | Notification Service | Within 10 seconds |
| 7 | Carol checks transaction history; sees transfer | Account Service | Transaction visible immediately (no EOD wait) |

**Business rules in scope:**
- Available balance updated in real time via FiServ API; book balance not shown to customers
- If transfer attempted during AS/400 batch window (00:00–04:00 CT), Payment Service queues it and shows "Scheduled — will process after maintenance window"
- Overdraft protection: if checking balance would go negative, system checks linked savings first; auto-transfer covers shortfall (max 3 auto-transfers/day)

---

## Journey 2 — Retail Customer: Initiate an ACH External Transfer

### Persona: Tom, 34, freelancer; moves money between Heritage and his business account at another bank

**Goal**: Transfer $3,000 from his Heritage checking to an external business account for next-day ACH.

| Step | Action | Service | Detail |
|------|--------|---------|--------|
| 1 | Navigates to "Transfers → External" in online banking | Payment Service | External account already linked |
| 2 | Selects linked external account; enters $3,000 | Payment Service | Velocity check: ACH credit limit $25,000/day |
| 3 | Selects "Next Business Day" delivery | Payment Service | SDIE (same-day) option shown only if before 2:30 PM CT |
| 4 | Confirms transfer | Payment Service | Idempotency key generated; stored in Redis |
| 5 | ACH file built; submitted to AS/400 ACH module via IBM MQ | BIH → AS/400 | AS/400 submits to FedACH at scheduled window |
| 6 | Confirmation email sent; ACH tracking ID shown | Notification Service | — |
| 7 | Next morning: funds debited from Heritage checking | AS/400 (nightly batch) | Book balance updated; transaction posted |
| 8 | ACH return (if any) triggers notification within 24h | Payment Service → Notification Service | — |

**Key acceptance criteria:**
- SDIE option must be disabled in the UI after 2:30 PM CT (not just server-side — prevent confusion)
- Velocity limit (ACH credit $25,000/day, ACH debit $10,000/day) checked at Payment Service; clear error message with current day's total and remaining limit
- Duplicate submission protection: same amount + same external account + same day → block with "duplicate transfer" warning
- ACH return codes must be translated to plain-English messages (e.g., R01 "Insufficient funds at receiving bank")

---

## Journey 3 — Fraud Alert and Card Block

### Persona: David, 41, whose debit card was used fraudulently while he was travelling

**Goal**: Lock his card immediately when he receives a fraud alert; dispute the transaction.

| Step | Action | Service | Detail |
|------|--------|---------|--------|
| 1 | NICE Actimize detects anomalous transaction ($890 at foreign merchant) | Fraud & Compliance Service | Actimize pushes alert via REST to Fraud Service |
| 2 | Heritage push notification + SMS: "Unusual activity detected" | Notification Service | Within 60 seconds of Actimize alert |
| 3 | David opens app; sees fraud alert banner | Card Management Service | — |
| 4 | Taps "Lock Card" | Card Management Service → FIS Worldpay | Card status = BLOCKED in Worldpay within 5 seconds |
| 5 | Taps "Dispute Transaction" | Payment Service | Reg E dispute opened; provisional credit initiated |
| 6 | CSA notified; case created in Salesforce | Fraud & Compliance Service → Salesforce | Linked to transaction ID |
| 7 | Provisional credit posted within 10 business days | Account Service → BIH | Reg E requirement |
| 8 | Investigation completed; permanent credit or debit | Compliance team action | Written resolution sent to David |

**Acceptance criteria:**
- Card lock must take effect at FIS Worldpay within 5 seconds of user tap; subsequent transactions declined immediately
- Fraud alert notification must arrive within 60 seconds of Actimize alert ingestion on Kafka
- Reg E dispute form must capture: transaction date, amount, merchant, description of dispute; auto-populate from transaction record
- Provisional credit must not exceed the disputed transaction amount; shown as pending in account history with label "Dispute — provisional credit"

---

## Journey 4 — SMB Owner: Set Up an Authorised User

### Persona: Rachel, 44, owner of a 12-person landscaping business; uses Heritage Business Banking

**Goal**: Give her office manager Maria view-only access to check balances, and her bookkeeper James initiator access for ACH payroll — but not approver access.

| Step | Action | Service | Detail |
|------|--------|---------|--------|
| 1 | Rachel logs into SMB Portal | Identity Service | Cognito business user pool; MFA required |
| 2 | Navigates to "Team Access" → "Add User" | Customer Service | — |
| 3 | Enters Maria's email; selects "Viewer" role | Customer Service → SMB Portal BFF | Viewer = read-only; no transaction initiation |
| 4 | Maria receives invite; completes registration with MFA | Identity Service | — |
| 5 | Enters James's email; selects "Initiator" role | Customer Service | Initiator = create transfers, cannot approve |
| 6 | James cannot be assigned "Approver" at the same time | SMB Portal BFF | Business rule enforced at API layer, not just UI |
| 7 | Rachel as Owner approves James's ACH payroll run | Payment Service | Dual auth: Initiator creates, Owner/Approver approves |
| 8 | ACH payroll file uploaded by James (NACHA format) | Payment Service → BIH → AS/400 ACH | ≤ $25,000 approval by Rachel; above $25,000 requires Wire Desk |

**Acceptance criteria:**
- Role assignment (Viewer / Initiator / Approver) enforced at Payment Service API — UI enforcement alone is not sufficient
- A user with Initiator role must not see the "Approve" button on any transaction they created
- Removing a user must immediately revoke all active sessions for that user (Okta token revocation)
- NACHA file validation: ACH Service must parse and validate file format before submitting to BIH; return descriptive errors for malformed entries

---

## Journey 5 — Branch Teller: Assisted Service

### Persona: Sandra, branch teller at Heritage's Columbus flagship branch

**Goal**: Help a customer who forgot their mobile login and wants to check their balance and request a wire.

| Step | Action | Service | Detail |
|------|--------|---------|--------|
| 1 | Sandra authenticates to Branch Teller App (mTLS + SAML SSO via Active Directory) | Identity Service | Internal only; no customer-facing Okta |
| 2 | Searches customer by name + last 4 of SSN | Customer Service → BIH → AS/400 | Read-only identity lookup |
| 3 | Verifies customer identity (government ID + verbal KBA) | Customer Service | ID document scan logged as Audit event |
| 4 | Reads account balances and recent transactions on behalf of customer | Account Service | Audit event: actor = Sandra's employee ID, patient = customer MRN/account |
| 5 | Customer requests $15,000 wire to vendor | Payment Service | Wire above $10,000 requires Branch Manager PIN approval |
| 6 | Sandra initiates wire; Branch Manager Janet approves with PIN | Payment Service | Dual-auth enforced by Payment Service; branch manager role checked |
| 7 | Wire submitted to Wire Desk; confirmation number issued | Payment Service → BIH → AS/400 Fedwire | Wire Desk processes same day if before 14:30 CT |
| 8 | Sandra ends session; 8-minute inactivity timeout | Identity Service | Stricter timeout for internal teller sessions |

**Acceptance criteria:**
- Teller session must timeout after 8 minutes inactivity (stricter than customer 10-minute rule)
- All teller-on-behalf-of-customer actions must log both the teller ID and the customer account number to Audit Service
- Branch Manager approval must be captured as a separate authentication event (not just a PIN field in a form)
- Wire confirmation number from AS/400 must be displayed to Sandra and emailed to the customer automatically

---

## Legacy Integration Pain Points (Current State)

The following table documents pain points in the current AS/400-connected system that the BIH modernisation aims to resolve:

| Pain point | Current behaviour | Target behaviour after BIH |
|-----------|------------------|---------------------------|
| Balance displayed to customers | Book balance (as of EOD yesterday) | Available balance (real-time via FiServ API) |
| Transfer during batch window | Teller sees "Host Unavailable" error; customer must call back | Queue + retry; customer sees "Scheduled for after maintenance" |
| ACH return codes | Raw NACHA R-codes shown in teller system | Plain-English translation in both teller app and customer app |
| Card lock | Teller calls FIS Worldpay support line; 10-minute wait | Card Management Service API to Worldpay < 5 seconds |
| Wire dual auth | Manager walks to teller terminal and types on same screen | Separate approval from manager's own device |
| Audit trail | AS/400 produces SMF log; reviewed weekly by compliance | Real-time Kafka stream → Audit Service → Elasticsearch |
