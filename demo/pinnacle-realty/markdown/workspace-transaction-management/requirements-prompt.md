# Requirements Prompt — Pinnacle Properties Group Transaction Management Team

## How to use this file

1. In ProductPilot, go to **Settings → Enterprise Context** and paste `enterprise/enterprise-domain-context.md` into the Domain Context field. Paste `enterprise/enterprise-tech-context.md` into the Tech Context field.
2. Select or create the **Transaction Management** workspace. Paste `workspace-transaction-management/domain-context.md` into its Domain Context field and `workspace-transaction-management/tech-context.md` into its Tech Context field.
3. Copy the requirements text below and paste it into the **Requirements Intake** screen.

---

## Requirements Text (paste this)

```
Build the transaction management and commission processing system for DealDesk — Pinnacle Properties
Group's unified brokerage operations platform covering 3,200 agents across Texas and Florida.

The platform replaces a home-grown Excel/Google Sheets tracker, dotloop (documents), and manual QuickBooks
commission reconciliation.

Scope for this initiative:

1. TRANSACTION LIFECYCLE MANAGEMENT
   - Create a transaction specifying: type (buyer representation, listing/seller, dual agency, referral-in, referral-out, new construction), property address, MLS listing ID, client names, estimated close date, gross commission
   - Milestone state machine: Lead/Prospect → Contract Accepted → Under Contract → Inspection Period → Appraisal → Clear to Close → Closed → Disbursed
   - Hard-block enforcement: milestone cannot advance until all required documents for the current milestone are uploaded, approved, and (where required) countersigned via DocuSign
   - TC assignment: auto-assigned by office routing rules or manually assigned by Branch Manager; TC owns document and milestone workflow once assigned
   - MLS listing linkage: transactions for buyer or listing representation linked to MLS listing ID; MLS status changes automatically update the transaction milestone (read-only Phase 1)

2. DUAL AGENCY WORKFLOW
   - If transaction type is Dual Agency: Branch Manager must approve the dual agency designation in DealDesk before any DocuSign envelopes are sent to clients
   - Dual agency consent form sent to both buyer AND seller via DocuSign; transaction cannot advance past Contract Accepted until both signatures are confirmed
   - Dual Agency transactions use a stricter document checklist reflecting Texas (TREC) and Florida (FREC) disclosure rules

3. COMPLIANCE DOCUMENT VAULT
   - Per-transaction required document checklist: configurable per transaction type and milestone
   - State-mandated form library: versioned TREC (Texas) and FREC (Florida) forms; transactions use the form version effective on the contract date
   - DocuSign integration for all e-signature documents; signer routing configurable per document type; completed envelopes auto-stored in Document Vault via DocuSign Connect webhook
   - RESPA / TRID enforcement: for mortgaged purchase transactions, track Closing Disclosure delivery date; enforce 3-business-day waiting period before closing; block Clear-to-Close milestone advancement if closing date falls within the waiting period
   - Document retention: S3 SSE-KMS; 7-year retention (Standard years 1–3, Glacier years 3–7)

4. COMMISSION ENGINE
   - Support four commission plan types: Standard Split (fixed %); Cap Model (split until annual cap, then 100% to agent, cap resets on anniversary date); Graduated Split (tiered % by YTD production volume); Team Model (Team Lead override % applied before agent split)
   - All plan parameters configurable by Finance without a code deployment
   - Calculations are idempotent: same inputs always produce the same output; every calculation versioned and logged (inputHash, inputs JSON, outputs JSON)
   - Cap boundary: if a transaction causes the YTD accumulator to cross the cap threshold, the engine splits the transaction — brokerage split applies up to the cap, then 100% to agent for the remainder
   - Commission plan applied is the plan at the time the contract was accepted — not the plan at time of close

5. CDA GENERATION & DISBURSEMENT
   - After transaction reaches Closed milestone with all documents accepted: Commission Engine generates a CDA PDF (property address, closing date, GCI, split breakdown, referral fee if applicable, agent net payout)
   - CDA sent via DocuSign to Broker of Record for countersignature
   - After countersignature confirmed (DocuSign webhook): Disbursement Service initiates a Stripe Connect payout to the agent's connected bank account
   - Standard ACH (2 business days) default; instant payout (1.5% fee, same-day) available per agent opt-in
   - Every disbursement synced to QuickBooks Online as a journal entry within 15 minutes of payout confirmation

6. ANALYTICS & REPORTING
   - Agent dashboard: GCI YTD, unit count, active transactions, estimated commission on pending, cap progress
   - Branch leaderboard: GCI and unit count per agent (MTD, QTD, YTD)
   - Finance reports: disbursement queue (CDAs pending countersignature), QBO sync status, cap progress for all cap-model agents
   - Office P&L: gross commission by office, less referral fees paid, less agent payouts = brokerage net revenue (Phase 2)

Platform integrations: DocuSign (e-signatures + CDA countersignature via DocuSign Connect webhook),
Stripe Connect (commission disbursements), QuickBooks Online (accounting sync), NTREIS + HAR + Stellar MLS
(RESO Web API listing status polling), Agent Service (plan type + Stripe accountId per agent),
Amazon S3 SSE-KMS (document vault), Amazon EventBridge (transaction and commission domain events).

Phase 1 (8 months): transaction lifecycle, document checklist enforcement, Commission Engine (Standard Split + Cap Model, Texas markets — NTREIS + HAR), CDA workflow, Stripe disbursement, QBO sync.
Phase 2 (months 9–16): Dual Agency workflow, Graduated Split + Team Model plan types, Florida market (Stellar MLS), TRID enforcement, RESO MLS write-back, Office P&L analytics.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Milestone hard-block | Enforced server-side by Transaction Service calling Document Service before state transition; HTTP 409 returns list of missing/unresolved documents; UI reflects this but is not the enforcement layer |
| Commission calculation idempotency | Pure function: same transactionId + planVersion + ytdBrokeragePaid + anniversaryDate inputs always produce identical output; every calculation stored with SHA-256 inputHash; 100% unit test coverage required |
| Plan at contract date | Commission Engine fetches agent's plan as of the contract accepted date from Agent Service; if the plan changed between acceptance and close, the historical plan is used |
| Cap boundary mid-transaction | Engine calculates: amount subject to brokerage split = min(GCI × split_pct, remaining cap); remainder goes 100% to agent; both portions on the same CDA |
| CDA countersignature | Always countersigned by Broker of Record (or authorized designee) via DocuSign; Disbursement Service does not initiate any payout until `cda.countersigned` EventBridge event is received |
| DocuSign webhook security | HMAC signature verification before processing any webhook payload; duplicate envelopeId events are idempotent (no double state change) |
| TRID waiting period | 3 business days = excludes weekends and US federal holidays; holiday calendar stored in Document Service; earliest permissible closing date shown to TC on block |
| MLS sync failures | After 3 consecutive failed sync cycles for a listing: alert TC and Branch Manager via Notification Service; manual re-sync available in Finance/Admin console |
| Phasing | Phase 1 (8 months): transaction lifecycle, Standard Split + Cap Model, CDA, Stripe, QBO, Texas MLS; Phase 2: Dual Agency, Graduated + Team plans, Florida, TRID, MLS write-back, Office P&L |
