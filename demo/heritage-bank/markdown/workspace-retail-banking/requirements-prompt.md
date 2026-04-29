# Requirements Prompt — Heritage Bank Retail Banking Team

## How to use this file

1. In ProductPilot, go to **Settings → Enterprise Context** and paste `enterprise/enterprise-domain-context.md` into the Domain Context field. Paste `enterprise/enterprise-tech-context.md` into the Tech Context field.
2. Select or create the **Retail Banking** workspace. Paste `workspace-retail-banking/domain-context.md` into its Domain Context field and `workspace-retail-banking/tech-context.md` into its Tech Context field.
3. Copy the requirements text below and paste it into the **Requirements Intake** screen.

---

## Requirements Text (paste this)

```
Build a modern retail digital banking experience for Heritage Bank's 1.2 million retail customers,
covering mobile banking (iOS + Android) and online banking portal.

The IBM AS/400 (IBM i / FiServ Precision) remains the authoritative core banking system.
All account and transaction data flows through the Banking Integration Hub (BIH).
No changes are made to AS/400 COBOL or RPG code.

Scope for this initiative:

1. ACCOUNT MANAGEMENT
   - Real-time available balance and 24-month transaction history for all account types
     (Checking, Savings, Money Market, CD, HELOC, Personal Loan)
   - Statement PDF download for the last 24 months
   - CD maturity alerts at 60, 30, and 7 days before maturity; customer can instruct rollover or withdrawal
   - Account nickname management (display-only; does not change AS/400 account name)
   - Regulation D: display Savings withdrawal count per statement cycle; warn at 5 withdrawals; hard-block at 6 (AS/400 enforces)
   - HELOC available credit and draw history

2. TRANSFERS & PAYMENTS
   - Immediate internal transfers between Heritage accounts (real-time via FiServ API)
   - ACH external transfers: next-day (cut-off 8 PM CT) and same-day SDIE (cut-off 2:30 PM CT, max $25,000)
   - Zelle P2P: real-time; 15-minute hold on first payment to a new recipient; max $2,500/day
   - RTP (Real-Time Payments via TCH): sub-5-second settlement; no rollback after submission
   - Bill pay via Fiserv CheckFree: payee management, scheduled and recurring payments
   - Wire transfer initiation (domestic Fedwire and international SWIFT) — submitted to Wire Desk for manual release
   - Overdraft protection enrollment: auto-transfer from linked savings (max 3/day); NSF fee notification
   - All AS/400 write operations queued during batch windows (midnight–4 AM CT, 6 PM CT EOD)

3. CARD MANAGEMENT
   - Debit card lock/unlock (instant, via FIS Worldpay API; reflected in app within 3 seconds)
   - Travel notice: date range and destination countries
   - Spending controls: daily ATM and daily POS limits
   - Lost/stolen card replacement request; digital card available immediately; physical in 3–5 business days
   - Transaction dispute initiation (Reg E): provisional credit within 5 business days; resolution within 10 business days

4. CONSUMER ACCOUNT OPENING
   - Checking and Savings account opening via Blend integration
   - Identity verification: Okta identity + Experian CIP check + KBA (Knowledge-Based Authentication)
   - CIP document upload (government-issued ID)
   - Initial funding via debit card (Adyen) or ACH pull from an external bank

5. NOTIFICATIONS & ALERTS
   - Balance threshold alerts (below/above customer-defined amount)
   - Large transaction alerts (default $500, configurable)
   - Failed login and account lockout (immediate push + email)
   - Fraud alert from Actimize (immediate push + SMS)
   - CD maturity approaching (60-day, 30-day, 7-day)
   - ACH return / wire failure (same-day notification)
   - All notifications respect customer channel preferences (push / SMS / email)

6. SECURITY & ACCESS
   - Okta OIDC/PKCE for mobile; Okta session-based for web
   - MFA mandatory: SMS OTP or TOTP authenticator app; biometric (FaceID/TouchID) as second factor on mobile
   - Account lockout after 5 consecutive failed logins; unlock via verified phone call or branch visit
   - Session timeout: 10 minutes inactivity (web), 5 minutes (mobile)
   - All access events logged to Audit Service (SOX + BSA compliance)

Platform integrations: BIH → AS/400 (FiServ Open Solutions + IBM MQ), FIS Worldpay (card),
EWS/Zelle (P2P), TCH RTP, Fiserv CheckFree (bill pay), Blend (account opening), Okta (identity),
NICE Actimize (fraud alerts).

Phase 1 (12 months): account management, internal transfers, ACH, Zelle, bill pay, card lock/unlock, notifications, security.
Phase 2 (months 13–18): card disputes, travel notice, spending controls, RTP, wire initiation, Blend account opening.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Balance display | Always show available balance from FiServ real-time API; never show book balance; cache max 30 seconds |
| AS/400 batch window | No AS/400 writes midnight–4 AM CT (nightly batch) and 6 PM CT (EOD); services queue and retry; UI shows "processing" status |
| Reg D enforcement | Display withdrawal count; warn at 5; hard block at 6 — enforced by AS/400, mirrored in UI |
| Zelle hold | 15-minute hold on first payment to any new recipient (enforced by Transfer Service, not EWS) |
| Wire initiation | Retail customers can initiate a wire via the portal; submitted to Wire Desk for manual release; not auto-processed |
| Dispute provisional credit | Manual process in Phase 1 (Fraud Analyst team applies credit); automated flow in Phase 2 |
| Account opening identity | Okta identity + Experian CIP + KBA; government ID document upload via Blend |
| Phasing | Phase 1 (12 months): core account management, transfers, ACH, Zelle, card lock, alerts; Phase 2 (months 13–18): disputes, wire, RTP, Blend account opening |
