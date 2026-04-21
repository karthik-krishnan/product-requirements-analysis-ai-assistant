# Requirements Prompt — Heritage Bank Digital Programme

## How to use this file

Copy the text inside the box below and paste it into the **Requirements Intake** screen of ProductPilot.
Upload `customer-journey.md` and `compliance-and-risk.md` to the **Domain Context** file upload area.
Paste or upload `domain-context.md` as domain text and `technical-context.md` as tech context.

---

## Requirements Text (paste this)

```
Modernise Heritage Bank's customer-facing digital channels — mobile banking app, online banking portal, and a new SMB business portal — while keeping the IBM AS/400 (IBM i / FiServ Precision) core banking system as the authoritative source of record.

The digital programme follows a strangler-fig approach: a Banking Integration Hub (BIH) adapts between modern REST microservices and the AS/400, progressively replacing screen-scraping and batch integrations. No changes are to be made to AS/400 COBOL or RPG code.

The following capabilities must be delivered:

1. ACCOUNT MANAGEMENT
   - Real-time available balance and transaction history for all account types (Checking, Savings, Money Market, CD, HELOC, Personal Loan)
   - Statement download (PDF) for the last 24 months; older statements via branch request
   - Account nickname and alert preferences management
   - CD maturity notification and renewal/withdrawal instruction capture (60-day, 30-day, 7-day alerts)
   - HELOC available credit and draw history

2. TRANSFERS & PAYMENTS
   - Immediate internal transfers between Heritage accounts (real-time via FiServ API)
   - ACH external transfers: next-day and same-day (SDIE, 2:30 PM CT cut-off)
   - Zelle P2P (real-time via EWS network); 15-minute hold on first payment to new recipient
   - RTP (Real-Time Payments via TCH network, sub-5-second settlement)
   - Bill pay via Fiserv CheckFree; payee management; scheduled and recurring payments
   - Wire transfer initiation (domestic Fedwire and international SWIFT); dual authorisation required above $10,000
   - Overdraft protection: auto-transfer from linked savings (max 3/day); NSF fee notification

3. CARD MANAGEMENT
   - Debit card lock/unlock (instant, via FIS Worldpay)
   - Travel notice: date range and countries
   - Spending controls: daily ATM limit, daily POS limit (within FIS Worldpay card programme rules)
   - Lost/stolen card replacement request
   - Transaction dispute initiation (Reg E); provisional credit tracking

4. SMB BUSINESS PORTAL
   - Multi-account dashboard for business checking, savings, and HELOC
   - User role management: Owner can add users as Viewer, Initiator, or Approver; no user is both Initiator and Approver on the same transaction
   - ACH payroll file upload (NACHA format); dual authorisation above $25,000
   - ACH batch status tracking: submitted → accepted → settled / returned
   - Wire initiation and approval workflow

5. ACCOUNT OPENING (DIGITAL)
   - Consumer checking and savings account opening via Blend integration
   - Identity verification: Okta + Experian identity check + knowledge-based authentication (KBA)
   - CIP (Customer Identification Programme) document upload (government-issued ID)
   - Initial funding via debit card (Adyen) or ACH from external bank
   - SMB account opening: online form; BIH submits to AS/400 Loan/DDA module; manual underwriting review queue

6. NOTIFICATIONS & ALERTS
   - Balance threshold alerts (below/above customer-defined amount)
   - Large transaction alerts (above $500 by default, configurable)
   - Failed login and account lockout alerts (immediate)
   - Fraud alert from Actimize (immediate push + SMS)
   - CD maturity approaching
   - ACH return / wire failure notifications

7. SECURITY & ACCESS
   - Okta-based authentication: OIDC/PKCE for mobile; session-based for web
   - MFA: SMS OTP or TOTP authenticator app; mandatory for all accounts
   - Biometric (FaceID / TouchID / fingerprint) as a second factor on mobile
   - Account lockout: 5 consecutive failures; unlock via verified phone call or branch visit
   - Session timeout: 10 minutes inactivity (online banking), 5 minutes (mobile)
   - All customer data access logged to Audit Service (SOX + BSA compliance)

The platform must integrate with:
- IBM AS/400 (via Banking Integration Hub) — FiServ Open Solutions API + IBM MQ
- FIS Worldpay (card management and debit card processing)
- EWS / Zelle (P2P payments)
- TCH RTP (real-time payments)
- Fiserv CheckFree (bill pay)
- Okta (identity and access management)
- NICE Actimize (fraud alerts to customer)
- Blend (consumer loan and account origination)
- Salesforce Financial Services Cloud (service cases linked to transactions)

Phase 1 (12 months): items 1, 2, 4 (multi-account view + ACH payroll), 6, 7.
Phase 2 (months 13–18): card management, SMB user roles, wire initiation, Blend account opening.
Phase 3 (months 19–24): HELOC draw management, RTP, full SMB portal.

Critical constraint: all AS/400-bound operations must be queued and retried around batch windows (00:00–04:00 CT nightly, 18:00 CT EOD). Customer-facing UI must show a "scheduled maintenance" message during these windows without fully blocking access to cached data.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Primary users | Retail customers (1.2M), SMB owners and their authorised users (85K businesses), branch tellers (internal) |
| Legacy integration | AS/400 FiServ Precision via Banking Integration Hub (BIH); no changes to AS/400 COBOL/RPG code |
| Compliance | BSA/AML (NICE Actimize), SOX ITGC (audit trail, CAB process), Reg E (dispute resolution), PCI DSS SAQ-D |
| Batch window constraint | No AS/400 writes 00:00–04:00 CT (nightly batch) and 18:00–18:30 CT (EOD); services must queue and retry |
| Real-time vs book balance | Always show available balance (FiServ real-time API); never show book balance (ledger, updated at EOD batch) |
| Change management | SOX requires CAB approval for all production changes; no Friday deployments after 15:00 CT |
| Phasing | Phase 1 in 12 months (core accounts, transfers, SMB multi-account, ACH payroll); Phases 2–3 add cards, lending, RTP |
| SMB dual auth | Initiator cannot be Approver on the same transaction; enforced at Payment Service level, not just UI |
