# Pinnacle Properties Group — Transaction Management Team: Domain Context

## Team Scope

The Transaction Management Team owns the **transaction lifecycle**, from deal creation through commission disbursement. This includes the milestone workflow, document checklist enforcement, Commission Engine (all four plan types), CDA generation and countersignature via DocuSign, Stripe Connect disbursement, QuickBooks Online sync, and MLS integration for listing status changes.

---

## Team Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Transaction Coordinator (TC)** | Manages document and milestone workflow for assigned transactions | Document checklist, milestone advancement, DocuSign routing, deadline tracking |
| **Branch Manager** | Oversees transactions in their office; approves dual agency | Dual agency approval, CDA approval queue, exception management |
| **Broker of Record** | Countersigns all CDAs; legal responsibility for all agent conduct | CDA review queue, countersignature via DocuSign, audit trail |
| **Accounting / Finance** | Disburses commissions; reconciles with QuickBooks | CDA countersignature status, Stripe payout queue, QBO sync status |
| **Buyer's Agent / Listing Specialist** | Participating agent; visibility into their transaction status | My transactions, milestone status, document checklist progress, commission preview |

---

## Transaction Lifecycle

Every transaction progresses through a configurable milestone chain. Advancement to the next milestone requires all required documents for the current milestone to be uploaded, approved, and — where required — countersigned.

**Default milestone chain:**
```
Lead / Prospect → Contract Accepted → Under Contract → Inspection Period → Appraisal → Clear to Close → Closed → Disbursed
```

Each milestone has:
- A **target date** (calculated from contract date or estimated close date)
- A **required document checklist** (specific to transaction type and state)
- A **responsible party** (agent or TC)
- A **hard-block**: the milestone cannot advance until all required documents are present and approved

---

## Document Checklist & Compliance Vault

### Required Documents (examples by milestone)

| Milestone | Document | Condition |
|---|---|---|
| Contract Accepted | Buyer Representation Agreement | Buyer-side transactions |
| Contract Accepted | Seller's Disclosure Notice | Texas only |
| Contract Accepted | Dual Agency Consent (both buyer + seller via DocuSign) | Dual Agency transactions |
| Contract Accepted | Lead-Based Paint Disclosure | Homes built before 1978 |
| Contract Accepted | Radon Gas Disclosure | Florida only |
| Under Contract | Executed Sales Contract | All transaction types |
| Inspection Period | Inspection Report | All transaction types |
| Appraisal | Appraisal Report | Mortgaged purchases |
| Clear to Close | Closing Disclosure / HUD-1 | Mortgaged purchases |
| Clear to Close | TRID compliance timestamp | Mortgaged purchases — CD delivered ≥ 3 business days before closing |
| Closed | Final CDA (countersigned) | All transaction types |

### Document Vault Rules
- All documents stored in S3 (SSE-KMS); 7-year retention enforced by S3 Lifecycle Policy
- DocuSign envelopes are automatically retrieved and stored in the Document Vault on completion (via DocuSign Connect webhook)
- Documents requiring e-signature are sent from DealDesk via DocuSign; signer routing is configurable per document type
- The **state-mandated form library** is versioned in DealDesk: TREC forms (Texas) and FREC forms (Florida); transactions use the form version effective on the contract date

### TRID Compliance (RESPA)
- For purchase transactions with a mortgage: DealDesk tracks the **Closing Disclosure delivery date**
- The platform enforces a **3-business-day waiting period** before closing
- Compliance alert is raised (and the "Clear to Close" milestone is blocked) if the scheduled closing date falls within 3 business days of CD delivery

---

## Dual Agency Workflow

- If transaction type is **Dual Agency**, the system presents a dual agency consent form to both buyer and seller via DocuSign before the transaction can advance past Contract Accepted
- **Branch Manager approval** of the dual agency designation is required (approval captured in DealDesk before the DocuSign envelope is sent to clients)
- Dual Agency transactions have a separate, stricter document checklist reflecting state disclosure requirements (Texas TREC rule; Florida FREC rule)

---

## Commission Engine

The Commission Engine calculates all commission amounts for every transaction at close. All calculations are **idempotent** (same inputs = same output) and **versioned** (every calculation logged with a hash of inputs).

### Supported Plan Types

| Plan | Calculation Logic |
|---|---|
| **Standard Split** | `Agent Net = GCI × agent_split_pct`; `Brokerage Net = GCI × (1 - agent_split_pct)` |
| **Cap Model** | If `ytd_brokerage_paid < cap_amount`: normal split applies. If this transaction causes YTD to exceed cap: split only until cap is reached; remainder goes to agent at 100%. After cap: `Agent Net = GCI - any_desk_fees`. |
| **Graduated Split** | Determine which production tier the agent is in (based on YTD GCI before this transaction); apply the corresponding split ratio |
| **Team Model** | `Team Lead Override = GCI × team_lead_override_pct`; `Sub-Agent Net = (GCI - Team Lead Override) × sub_agent_split_pct`; `Brokerage Net = remainder` |

### CDA Generation
- After a transaction reaches **Closed** milestone and all checklist documents are accepted, the Commission Engine generates a **CDA PDF** containing: property address, closing date, gross sales price, GCI, split breakdown by recipient, referral fee (if applicable), any deductions, and agent net payout
- The CDA is sent via DocuSign to the Broker of Record for countersignature
- Once the DocuSign webhook confirms countersignature, the CDA is stored in the Document Vault and the Disbursement Service is triggered

### Commission Disbursement
- After CDA countersignature confirmed: Disbursement Service initiates a **Stripe Connect payout** to the agent's connected bank account
- **Standard ACH**: 2 business days; default for all agents
- **Instant payout**: available per agent preference (1.5% fee, same-day); agent must opt-in during onboarding
- Each disbursement is synced to **QuickBooks Online** as a journal entry via the QBO Sync Service

---

## MLS Integration

- **Read-only (Phase 1)**: MLS Sync Service polls NTREIS, HAR, and Stellar MLS every 15 minutes
- Listing status changes (e.g., NTREIS "Active Under Contract" → DealDesk "Contract Accepted") automatically update the corresponding transaction milestone
- If 3 consecutive sync jobs fail for a listing, TC and Branch Manager are alerted; manual re-sync available from the admin console
- **Write-back (Phase 2)**: Listing Specialists can create new MLS listings from DealDesk via RESO API write-back

---

## Business Rules Specific to Transaction Management

1. Milestone advancement is **hard-blocked** until all required documents for the current milestone are uploaded, approved, and (where required) countersigned — this is enforced at the API layer, not just the UI
2. A TC can be assigned to a transaction by a Branch Manager or auto-assigned based on office routing rules; once assigned, the TC owns the document and milestone workflow
3. **Referral-In transactions**: referral fee paid back to the referring brokerage (capped at 35% of gross commission) is calculated by the Commission Engine and appears as a line item on the CDA
4. The CDA must be countersigned by the **Broker of Record** (or an authorized designee) before any Stripe payout is initiated; no exceptions
5. Commission calculations are always performed using the agent's plan at the time the contract was **accepted** — not the plan at the time of close; this protects agents from plan changes mid-transaction
6. TRID 3-business-day waiting period is enforced by the system at the **Clear to Close** milestone; business days exclude weekends and federal holidays
