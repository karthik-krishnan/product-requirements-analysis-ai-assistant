# Heritage Bank — Domain Context

## About the Organisation

**Heritage Bank & Trust** is a mid-sized regional bank with **$48 billion in assets**, operating **210 branches** across the Midwest and Southeast US. Founded in 1923, Heritage runs its core banking operations on **IBM AS/400 (IBM i)** — a platform that has been in continuous production for 31 years. The bank serves approximately **1.2 million retail customers** and **85,000 business banking clients**.

**Heritage Digital** is the internal programme to modernise customer-facing channels — mobile banking, online banking, and a new SMB business portal — while leaving the proven AS/400 core banking system intact and treating it as the authoritative source of record.

The programme is a **strangler-fig modernisation**: new capabilities are built on a modern microservices layer that integrates to AS/400 via a **Banking Integration Hub (BIH)**, progressively replacing screen-scraping legacy batch integrations one domain at a time.

---

## Business Domain Concepts

### User Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Retail Customer** | Individual account holder | Balance checks, transfers, bill pay, statements, card controls |
| **SMB Owner** | Small-medium business banking client | Multi-account view, ACH payroll, wire transfers, account user management |
| **SMB Authorised User** | Employee granted access by SMB Owner | Role-scoped actions (view-only, initiate-only, approve-only) |
| **Branch Teller** | In-branch staff handling transactions | Look up customer, initiate transactions on behalf of customer, override certain holds |
| **Branch Manager** | Supervises tellers, handles exceptions | Override approvals, large cash transactions, account opening authority |
| **Customer Service Agent (CSA)** | Phone/chat support | Read-only customer view, initiate refunds, raise service tickets |
| **Fraud Analyst** | Monitors transaction patterns | Alert queue, case management, card block/unblock |
| **Compliance Officer** | AML, BSA, regulatory reporting | SAR filing, CTR generation, audit trail access |

### Account Types

- **Checking** — Demand deposit account (DDA); standard and interest-bearing variants
- **Savings** — Regulation D compliant; 6 withdrawal limit per statement cycle (legacy rule still enforced)
- **Money Market** — Tiered interest, cheque-writing capability
- **Certificate of Deposit (CD)** — Fixed term (3, 6, 12, 24, 36 months); early withdrawal penalty
- **HELOC** — Home Equity Line of Credit; draw/repayment cycle; linked to real estate collateral in AS/400
- **Personal Loan** — Instalment loan; amortisation schedule from AS/400 Loan module
- **Business Checking / Business Savings** — Multi-signatory; ACH origination enabled
- **Escrow / Trust accounts** — Managed by Wealth division (separate system, out of scope Phase 1)

### Core Banking on IBM AS/400 (IBM i)

- Core system: **FiServ Precision** running on IBM i 7.4 (Power9 hardware)
- All account records, transaction ledger, interest calculation, and GL entries live in AS/400
- Batch processing windows:
  - **Nightly batch**: midnight–4 AM CT — ACH settlement, interest posting, statement generation
  - **End-of-day (EOD)**: 6 PM CT — balance cutoff for same-day transactions
  - **Intra-day**: ACH returns processed at 10 AM and 2 PM CT
- Interfaces into AS/400:
  - **Screen scraping (legacy)**: IBM i green-screen sessions via TN5250 terminal emulation — used by older internal tools
  - **FiServ Open Solutions API**: REST wrapper around FiServ Precision; covers ~60% of operations; remainder requires COBOL batch jobs
  - **MQ Series**: IBM MQ for high-reliability async message exchange between AS/400 and modern services
- Real-time balance: AS/400 provides **book balance** and **available balance** (after holds); ledger balance updated at EOD batch

### Payments & Transfers

- **Internal transfers**: real-time within Heritage accounts; posted immediately to AS/400 via FiServ API
- **ACH (Automated Clearing House)**: originated via FedACH; files built by Payment Service, submitted via AS/400 ACH module; next-day or same-day (SDIE) settlement
- **Wire transfers**: domestic (Fedwire) and international (SWIFT); manual approval for wires > $10,000; processed by Wire Desk
- **Bill Pay**: managed by **Fiserv CheckFree**; Heritage sends payee data, CheckFree handles disbursement
- **Zelle**: peer-to-peer via Early Warning Services network; real-time; integrated at API layer (not through AS/400)
- **RTP (Real-Time Payments)**: TCH RTP network; sub-5-second settlement; routing via Payment Service
- **Card payments**: debit card managed by **FIS Worldpay**; Heritage AS/400 holds card-to-account linkage; Worldpay handles authorisation and settlement

### Lending

- **Consumer loan origination**: Blend platform (cloud-native); underwriting decision from Experian + Equifax; approval posts loan to AS/400 Loan module
- **Mortgage**: Encompass LOS; out of scope for Digital programme (separate team)
- **SMB lending**: manual process in branches; digital application form feeds AS/400 via BIH

### Fraud & Risk

- **Transaction monitoring**: NICE Actimize running on-prem; receives real-time transaction feed from Payment Service via Kafka
- **Card fraud**: FIS Worldpay fraud scoring; Heritage Fraud Analyst can block/unblock cards via Card Management Service
- **Suspicious Activity Reports (SARs)**: filed via FinCEN BSA E-Filing; triggered by Actimize case + Compliance Officer approval
- **Currency Transaction Reports (CTRs)**: auto-generated for cash transactions ≥ $10,000 in a single day
- **Velocity rules**: configurable per product (e.g., Zelle: max $2,500/day; ACH credit: max $25,000/day)

### Digital Channels

- **Mobile App**: iOS and Android (React Native); biometric auth; current DAU ~180,000
- **Online Banking**: React web SPA; session-based auth with Okta
- **Branch Teller System**: internal web app; read/write via BIH; replaces green-screen for most workflows
- **IVR**: Nuance-hosted phone banking; balance and recent transactions via AS/400 direct integration (not being replaced)

---

## Compliance & Regulatory Context

### Bank Secrecy Act (BSA) / AML
- Customer Identification Programme (CIP): identity verified at account opening; documents stored in customer record
- Ongoing monitoring: NICE Actimize monitors all transactions for suspicious patterns
- SAR filing: required within 30 days of determination; 90-day extension available with documentation
- CTR filing: required within 15 days of qualifying cash transaction
- Record retention: 5 years for BSA records

### Regulation E (Electronic Fund Transfers)
- Unauthorised transaction disputes: provisional credit within 10 business days; investigation within 45 days
- Error resolution notices: written response to customer within 3 business days of investigation completion

### Regulation D (Savings Accounts)
- Maximum 6 "convenient" withdrawals per statement cycle from savings/money market
- Excess transactions: fee on 7th+ transaction; account may be converted to checking after repeated violations

### Dodd-Frank / Consumer Protection
- Overdraft opt-in required for ATM and one-time debit card transactions
- Reg CC: funds availability schedule; next-day availability for government cheques, $225 same-day rule

### SOX (Sarbanes-Oxley)
- IT General Controls (ITGC) audit annually; change management evidence required for all production changes
- Segregation of duties: no developer has production AS/400 access; change requires CAB approval
- Audit trail: all configuration changes to BIH and modern services logged with actor, timestamp, diff

### PCI DSS
- Card data handled by FIS Worldpay; Heritage is SAQ-D (card data in scope via network)
- Tokenisation: PAN replaced with Worldpay token at point of capture; token stored in Card Management Service
- Quarterly ASV scans; annual ROC assessment

### Accessibility
- ADA / Section 508 for digital channels: WCAG 2.1 AA
- Mobile app: VoiceOver and TalkBack support mandatory

---

## Business Rules

1. Transfers between Heritage accounts posted immediately; available balance updated in real time via FiServ API — **book balance updated at EOD batch**
2. Wire transfers above **$10,000** require dual authorisation: initiating CSA + Wire Desk supervisor
3. ACH same-day credit (SDIE) cut-off is **2:30 PM CT**; submissions after cut-off are queued for next business day
4. Overdraft protection: if linked savings has sufficient funds, transfer occurs automatically (max **3 transfers per day**); otherwise standard NSF fee of $35 applies
5. CD early withdrawal penalty: **90 days' interest** for terms ≤ 12 months; **180 days' interest** for terms > 12 months
6. Zelle payments to new recipients (first payment) are **held for 15 minutes** for fraud review before release
7. SMB users can be granted one of three roles: **Viewer** (read-only), **Initiator** (can create but not approve), **Approver** (can approve up to their limit); no user can be both Initiator and Approver on the same transaction
8. Failed logins: **5 consecutive failures** lock the account; mobile biometric bypass disabled after lockout; unlock via verified phone call or branch visit
9. Savings account excess withdrawal: **fee of $10** applied per transaction over 6; if limit exceeded in **3 consecutive cycles**, account automatically converted to checking with written notice

---

## Integration Landscape

| System | Purpose | Protocol |
|---|---|---|
| **IBM AS/400 (IBM i) — FiServ Precision** | Core banking: accounts, ledger, interest, GL | FiServ Open Solutions API (REST) + IBM MQ |
| **Banking Integration Hub (BIH)** | API gateway / adaptor layer between AS/400 and modern services | REST / Kafka / IBM MQ |
| **FIS Worldpay** | Debit card issuer processing, authorisation, settlement | REST API + ISO 8583 |
| **Fiserv CheckFree** | Bill pay disbursement | Proprietary file exchange (SFTP) |
| **Early Warning Services (EWS)** | Zelle P2P network | REST API |
| **TCH RTP** | Real-Time Payments network | ISO 20022 / REST |
| **NICE Actimize** | AML / transaction monitoring | Kafka (real-time feed) + REST (case management) |
| **Blend** | Consumer loan origination | REST API |
| **Experian / Equifax** | Credit bureau decisioning | REST API |
| **Okta** | Identity provider, SSO, MFA | OIDC / SAML 2.0 |
| **Nuance (IVR)** | Phone banking (not being replaced) | Direct AS/400 CICS integration |
| **Salesforce Financial Services Cloud** | CRM, service cases, branch activity log | REST API (Salesforce Connect) |
| **Snowflake** | Data warehouse for analytics and regulatory reporting | Kafka → Snowflake Connector |
