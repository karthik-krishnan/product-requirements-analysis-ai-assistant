# Heritage Bank — Retail Banking Team: Domain Context

## Team Scope

The Retail Banking Team owns the **consumer digital channels** — mobile banking app (iOS + Android) and online banking portal — serving Heritage's 1.2 million retail customers. The team covers personal account management, retail transfers and payments (ACH, Zelle, RTP, bill pay, wire initiation), card management, and consumer account opening via Blend.

---

## Team Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Retail Customer** | Individual account holder; primary user of mobile and online banking | Balance and transaction history, transfers, card controls, statements, alerts |
| **Carer / Joint Account Holder** | Secondary account holder (joint account) | Same digital access as primary; separate login credentials |
| **Branch Teller** | In-branch staff; performs transactions on behalf of retail customers | Look up customer by account or SSN; initiate transfers; override holds; view transaction history |
| **Customer Service Agent (CSA)** | Phone and chat support | Read-only account view; initiate refunds; raise Salesforce service cases |

---

## Retail Account Management

- **Accounts displayed**: Checking (DDA), Savings, Money Market, CD, HELOC, Personal Loan
- **Balances**: always shows AS/400 **available balance** (real-time via FiServ API); never shows book balance (ledger, updated at EOD batch)
- **Transaction history**: up to 24 months displayed digitally; older transactions available on branch request
- **Statements**: PDF download for last 24 months; older statements via branch request
- **CD maturity management**: 60-day, 30-day, and 7-day alerts before maturity; customer can instruct rollover or withdrawal via the portal within the alert window
- **Account nicknames**: customers can rename accounts for display (e.g., "Vacation Fund")
- **Regulation D**: Savings account withdrawal limit (6 per statement cycle) displayed on account detail screen; customer warned when approaching the limit; AS/400 enforces the hard stop

---

## Retail Transfers & Payments

| Payment Type | Settlement | Key Rules |
|---|---|---|
| **Internal transfer** | Real-time (FiServ API) | Between Heritage accounts; posted immediately; reflected in available balance instantly |
| **ACH external (next-day)** | Next business day | Submitted to FedACH via BIH; cut-off 8 PM CT; returned items at 10 AM or 2 PM CT |
| **ACH external (same-day)** | Same day (SDIE) | Cut-off 2:30 PM CT; $25,000 per-transfer limit |
| **Zelle (P2P)** | Real-time (EWS) | 15-minute hold on first payment to a new recipient; max $2,500/day; no AS/400 pass-through |
| **RTP (Real-Time Payments)** | Sub-5-second (TCH) | Instant settlement; no rollback once submitted; max $100,000 per transaction |
| **Bill Pay (CheckFree)** | 1–5 business days | Payee management; scheduled and recurring payments; Heritage sends payee data, CheckFree disburses |
| **Wire (Fedwire / SWIFT)** | Same day (domestic) / 1–5 days (international) | Wire initiation via retail portal; processing by Wire Desk (see Commercial team for dual-auth rules) |

### Overdraft Protection
- Customers may enroll in overdraft protection: auto-transfer from a linked savings account (max 3/day)
- NSF (insufficient funds) fee notification sent immediately via push and email

---

## Card Management

| Feature | Detail |
|---|---|
| **Lock/unlock** | Instant debit card lock/unlock via FIS Worldpay API; reflected in app within 3 seconds |
| **Travel notice** | Customer sets date range and destination countries; sent to FIS Worldpay to suppress foreign transaction alerts |
| **Spending controls** | Daily ATM limit and daily POS limit (within FIS Worldpay card programme rules) |
| **Lost/stolen replacement** | Self-service card replacement request; digital card available in Apple/Google Pay immediately; physical card in 3–5 business days |
| **Transaction dispute (Reg E)** | Customer initiates dispute with transaction details; provisional credit within 5 business days; written resolution within 10 business days |

---

## Consumer Account Opening (Blend Integration)

- **Checking and Savings** accounts can be opened fully online via Blend
- Identity verification: Okta identity + Experian CIP check + Knowledge-Based Authentication (KBA)
- CIP document upload: government-issued ID (driver's license or passport)
- Initial funding: debit card (Adyen) or ACH pull from an external bank
- Account record created in AS/400 via BIH after Blend approves the application

---

## Notifications & Alerts

- **Balance threshold alerts**: customer sets a below/above threshold (e.g., "alert me if checking drops below $500")
- **Large transaction alerts**: default $500; configurable
- **Failed login / account lockout**: immediate push + email
- **Fraud alert from Actimize**: immediate push + SMS
- **CD maturity approaching**: 60-day, 30-day, 7-day
- **ACH return / wire failure**: same-day notification
- All notifications respect customer channel preferences (push / SMS / email); managed in the Customer Service profile

---

## Security

- Account lockout: **5 consecutive failed logins** → account locked; unlock via verified phone call or branch visit
- Session timeout: 10 minutes inactivity (online banking); 5 minutes (mobile)
- All events logged to Audit Service (SOX + BSA compliance)

---

## Business Rules Specific to Retail

1. Available balance is always sourced from FiServ Open Solutions API (real-time); book balance is never shown to the customer
2. ACH operations must be **queued and retried** around AS/400 batch windows (midnight–4 AM CT, 6 PM CT EOD)
3. Zelle first payment to a new recipient: **15-minute hold** before funds are released to the recipient
4. Customer may not initiate a Savings withdrawal that would exceed the **Reg D 6-withdrawal limit**; the 7th attempt is hard-blocked with a message to contact the branch
5. Dispute provisional credit must be applied within **5 business days** of a Reg E dispute being submitted
6. Wire initiation via the retail portal is submitted to the **Wire Desk** for manual review and release (not processed automatically)
