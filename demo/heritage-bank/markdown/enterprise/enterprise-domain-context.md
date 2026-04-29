# Heritage Bank & Trust — Enterprise Domain Context

## About the Organization

**Heritage Bank & Trust** is a mid-sized regional bank with **$48 billion in assets**, operating **210 branches** across the Midwest and Southeast US. Founded in 1923, Heritage serves approximately **1.2 million retail customers** and **85,000 business banking clients**. Core banking operations run on **IBM AS/400 (IBM i / FiServ Precision)** — a platform that has been in continuous production for 31 years and is treated as the authoritative source of record for all accounts, transactions, and interest calculations.

**Heritage Digital** is the internal modernization programme that builds new customer-facing and staff-facing digital channels while leaving the proven AS/400 core intact. The programme follows a **strangler-fig pattern**: a **Banking Integration Hub (BIH)** adapts between modern REST microservices and the AS/400, progressively replacing screen-scraping and batch integrations one domain at a time.

Two product teams operate under Heritage Digital:
- **Retail Banking Team** — consumer mobile and online banking for 1.2 million retail customers
- **Commercial Banking Team** — SMB business portal and commercial payments for 85,000 business clients

---

## Enterprise User Personas

| Persona | Team | Description |
|---|---|---|
| **Retail Customer** | Retail | Individual account holder; manages personal accounts digitally |
| **SMB Owner** | Commercial | Small-medium business banking client; multi-account access, ACH payroll, wires |
| **SMB Authorized User** | Commercial | Employee granted access by SMB Owner; role-scoped (view/initiate/approve) |
| **Branch Teller** | Both | In-branch staff; handles transactions on behalf of customers |
| **Branch Manager** | Both | Supervises tellers; handles exceptions; account opening authority |
| **Customer Service Agent (CSA)** | Both | Phone/chat support; read-only customer view; raises service tickets |
| **Fraud Analyst** | Both | Monitors transaction patterns; manages alert queue; card block/unblock |
| **Compliance Officer** | Both | BSA/AML reporting; SAR filing; audit trail access |

---

## Core Banking System — IBM AS/400

- **Core system**: FiServ Precision running on IBM i 7.4 (Power9 hardware)
- All account records, transaction ledger, interest calculations, and GL entries live in AS/400
- **Batch processing windows** (critical constraint — no writes to AS/400 during these periods):
  - **Nightly batch**: midnight–4 AM CT — ACH settlement, interest posting, statement generation
  - **End-of-day (EOD)**: 6 PM CT — balance cutoff for same-day transactions
  - **Intra-day ACH returns**: processed at 10 AM and 2 PM CT
- **Real-time balance**: AS/400 provides available balance (after holds) via FiServ Open Solutions API; ledger balance updates at EOD batch
- **AS/400 is authoritative**: no digital service may show a balance or transaction status that contradicts AS/400 without flagging it as provisional

---

## Enterprise Account Types

| Account | Description |
|---|---|
| **Checking (DDA)** | Demand deposit account; standard and interest-bearing variants |
| **Savings** | Regulation D compliant; 6 withdrawal limit per statement cycle (legacy rule enforced) |
| **Money Market** | Tiered interest; cheque-writing capability |
| **CD (Certificate of Deposit)** | Fixed term (3, 6, 12, 24, 36 months); early withdrawal penalty |
| **HELOC** | Home Equity Line of Credit; draw/repayment cycle; collateral in AS/400 |
| **Personal Loan** | Installment loan; amortization schedule from AS/400 Loan module |
| **Business Checking / Savings** | Multi-signatory; ACH origination enabled |

---

## Enterprise Compliance & Regulatory Framework

### BSA/AML
- **Suspicious Activity Reports (SARs)**: filed via FinCEN BSA E-Filing; triggered by NICE Actimize case + Compliance Officer approval
- **Currency Transaction Reports (CTRs)**: auto-generated for cash transactions ≥ $10,000 in a single day
- Transaction monitoring: NICE Actimize (on-prem); receives real-time transaction feed via Kafka

### SOX (Sarbanes-Oxley) — IT General Controls
- All production changes require **CAB (Change Advisory Board) approval** and a rollback plan
- **No Friday deployments** after 15:00 CT
- All customer data access events logged to the Audit Service (immutable, 7-year retention)

### Regulation E
- Customers have the right to dispute unauthorized electronic fund transfers
- Heritage must provide provisional credit within 5 business days of a debit card dispute
- Resolution within 10 business days; written resolution notice required

### PCI DSS SAQ-D
- Heritage handles cardholder data for debit card programmes (via FIS Worldpay)
- Annual PCI audit; quarterly network scans; pen test annually

### Regulation D
- Savings accounts: maximum 6 withdrawals per statement cycle enforced at AS/400; Heritage must display this limit digitally and prevent/warn on excess

---

## Enterprise Integration Landscape

| System | Purpose | Primary Team |
|---|---|---|
| **IBM AS/400 (FiServ Precision)** | Core banking — authoritative source of record | Shared / BIH |
| **Banking Integration Hub (BIH)** | Adapter layer between microservices and AS/400 | Shared platform |
| **FIS Worldpay** | Debit card processing and authorization | Retail |
| **EWS / Zelle** | Peer-to-peer real-time payments | Retail |
| **TCH RTP** | Real-Time Payments network | Retail + Commercial |
| **Fiserv CheckFree** | Bill pay disbursement | Retail |
| **NICE Actimize** | Transaction fraud monitoring and AML | Both |
| **Blend** | Consumer account and loan origination platform | Retail |
| **IBM MQ** | Async message exchange between BIH and AS/400 | Shared / BIH |
| **Okta** | Identity and access management (OIDC + SAML) | Both |
| **Salesforce Financial Services Cloud** | Service cases linked to customer accounts | Both |
| **FedACH** | ACH payment submission | Commercial |
| **Fedwire / SWIFT** | Domestic and international wire transfers | Commercial |
