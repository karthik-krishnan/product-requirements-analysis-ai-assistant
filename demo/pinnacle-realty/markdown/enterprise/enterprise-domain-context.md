# Pinnacle Properties Group — Enterprise Domain Context

## About the Organization

**Pinnacle Properties Group** is a large independent residential real estate brokerage with **3,200 active licensed agents** across two states. The company operates **28 regional offices** — 18 in Texas and 10 in Florida — and closed approximately **18,500 transactions** in the prior fiscal year representing **$6.2 billion in gross sales volume**.

Pinnacle is fully independent (not a national franchise), which means its commission structures, compliance workflows, and technology decisions are entirely self-determined. The brokerage employs a **Broker of Record** in each state who holds legal responsibility for all agent activity.

**DealDesk** is the internal platform being built to consolidate all agent-facing and brokerage-admin operations. Today, operations run across four disconnected systems: **dotloop** (documents), **Follow Up Boss** (CRM), **QuickBooks Online** (accounting), and a home-grown Excel/Google Sheets transaction tracker. DealDesk replaces all of these.

Two product teams build DealDesk:
- **Agent Experience Team** — agent-facing portal: onboarding, licensing, cap tracking, and performance dashboard
- **Transaction Management Team** — transaction lifecycle, commission engine, CDA workflow, and compliance document vault

---

## Enterprise User Personas

| Persona | Team | Description |
|---|---|---|
| **Buyer's Agent** | Agent Experience | Represents buyers; manages showings, offers, and closing coordination |
| **Listing Specialist** | Agent Experience | Represents sellers; manages listing creation, pricing, and open houses |
| **Transaction Coordinator (TC)** | Transaction Management | Manages the document and milestone lifecycle of each transaction |
| **Branch Manager** | Both | Manages a regional office; agent production, compliance, recruiting |
| **Broker of Record** | Transaction Management | Licensed broker holding state-level legal responsibility; approves CDAs and dual agency |
| **Recruiting Admin** | Agent Experience | Manages incoming agent applications and onboarding pipeline |
| **Accounting / Finance** | Transaction Management | Disburses commissions, reconciles with QBO, manages cap tracking |
| **Agent (General)** | Both | Any active licensed agent; may play buyer or listing role depending on transaction |

---

## Commission Structures

Pinnacle supports four commission plan types. Every agent is assigned exactly one plan at onboarding, adjustable at anniversary.

| Plan | Description |
|---|---|
| **Standard Split** | Agent and brokerage share gross commission at a fixed ratio for all transactions (e.g., 80/20) |
| **Cap Model** | Agent pays brokerage a percentage until reaching an annual cap, then retains 100% for the rest of the year. Cap resets on the agent's **anniversary date** (not calendar year) |
| **Team Model** | Team Lead receives an override percentage on each team member transaction; sub-agents earn a negotiated sub-split |
| **Graduated Split** | Split ratio improves in tiers as the agent crosses production milestones within the year (e.g., 70/30 up to $5M, then 75/25 from $5M–$10M, then 80/20 above $10M) |

**Key concepts:**
- **GCI (Gross Commission Income)**: total commission dollars earned before any splits or deductions
- **CDA (Commission Disbursement Authorization)**: formal per-transaction document specifying exactly how gross commission is split; must be countersigned by the Broker of Record before any disbursement
- **Cap Tracking**: year-to-date brokerage-side commission paid by a cap-model agent; tracked against individual cap amount; resets on anniversary date
- **E&O (Errors & Omissions Insurance)**: required for all active agents; Pinnacle tracks individual expiry; expired E&O automatically blocks the agent from creating new transactions

---

## Agent Lifecycle

```
RECRUIT → PRE-LICENSE → LICENSE PENDING → ONBOARDING → ACTIVE → TOP PRODUCER → TEAM LEAD
```

- **RECRUIT**: prospect in the recruiting pipeline; no portal access
- **ONBOARDING**: new agent completing required setup steps before being permitted to transact
- **ACTIVE**: fully licensed and onboarded; can create and participate in transactions
- **Top Producer** and **Team Lead** are earned statuses based on production milestones

---

## Transaction Types

| Type | Description |
|---|---|
| **Buyer Representation** | Agent represents the buyer; buyer's agent commission typically paid by seller |
| **Seller / Listing Representation** | Agent represents the seller; listing agent earns listing-side commission |
| **Dual Agency** | Single agent or same brokerage represents both buyer and seller; requires written consent from both parties; state disclosure rules apply |
| **Referral-In** | External brokerage refers a client to Pinnacle; referral fee paid back to referring brokerage (capped at 35% of gross commission) |
| **Referral-Out** | Pinnacle agent refers a client to another brokerage; Pinnacle earns a referral fee |
| **New Construction** | Agent represents buyer of a new-build home; builder typically pays buyer's agent; separate document checklist |

---

## Enterprise Compliance & Regulatory Framework

### State Licensing
- **Texas**: TREC (Texas Real Estate Commission) — agents must hold a valid TREC license; continuing education (CE) tracked; license expiry = agent blocked from new transactions
- **Florida**: FREC (Florida Real Estate Commission) — equivalent to TREC; separate license number; CE requirements differ by license type
- **Broker of Record**: licensed Broker of Record required in each state; responsible for all agent conduct and document compliance

### RESPA / TRID
- For purchase transactions with a mortgage: DealDesk must track the **Closing Disclosure (CD) delivery date** and enforce the **3-business-day waiting period** before closing
- Compliance alert raised if closing date falls within the 3-day waiting period

### Fair Housing Act
- Annual Fair Housing training required for all agents; DealDesk tracks completion date and blocks transactions for agents with overdue training (Phase 2)

### Document Retention
- All transaction documents retained for **7 years** (S3 Standard for years 1–3; S3 Glacier for years 3–7)

---

## Enterprise Integration Landscape

| System | Purpose | Primary Team |
|---|---|---|
| **NTREIS** | Dallas-Fort Worth + North Texas MLS (RESO Web API) | Transaction Management |
| **HAR** | Houston MLS (RESO Web API) | Transaction Management |
| **Stellar MLS** | Florida MLS (RESO Web API) | Transaction Management |
| **DocuSign** | E-signatures on CDAs, listing agreements, disclosure forms | Transaction Management |
| **Stripe Connect** | Commission disbursements to agent bank accounts | Transaction Management |
| **QuickBooks Online (QBO)** | Accounting sync per closed transaction | Transaction Management |
| **Follow Up Boss** | Legacy CRM (read-only sync, Phase 1 only; deprecated Phase 2) | Agent Experience |
| **Calendly** | Showing appointment scheduling (Phase 1 embed in agent portal) | Agent Experience |
| **TREC API** | Texas license verification and CE status | Agent Experience |
| **FREC Portal** | Florida license verification | Agent Experience |
