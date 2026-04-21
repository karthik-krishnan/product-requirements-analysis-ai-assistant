# ProductPilot Demo Script — Heritage Bank Digital Programme

**Time**: ~8 minutes end-to-end  
**Audience**: Product managers, engineering leads, banking / fintech prospects  
**Mode**: Demo provider (no API key required)  
**Differentiator vs other demos**: Legacy AS/400 modernisation, strangler-fig pattern, SOX change management, hybrid on-prem + cloud architecture, dual-auth for wires, BSA/AML compliance

---

## Before You Start

Have this folder open in a file browser for drag-and-drop uploads.

| File | Used as | Upload to |
|------|---------|-----------|
| `domain-context.md` | Banking domain — AS/400, account types, payments | Domain Context — text or file upload |
| `technical-context.md` | Hybrid architecture — BIH, Spring Boot, Kafka, AS/400 | Tech Context — text or file upload |
| `customer-journey.md` | Retail + SMB + teller journey maps | Domain Context — file upload |
| `compliance-and-risk.md` | BSA/AML, SOX, Reg E, PCI DSS requirements | Domain Context — file upload |
| `requirements-prompt.md` | Requirements text to paste | Requirements Intake screen |

---

## Step 1 — Configure Domain Context (~1 min)

1. Open Settings → confirm provider is **Demo**
2. Set Assistance Level to **Balanced**
3. Paste `domain-context.md` contents into Domain Context text area
4. Drag `customer-journey.md` and `compliance-and-risk.md` into the file upload zone

   > _"This is a classic legacy modernisation programme. Heritage Bank runs FiServ Precision on IBM AS/400 — the core banking system that's been in production for 31 years. They're not replacing it; they're wrapping it with a Banking Integration Hub and building modern microservices on top. The domain context captures the AS/400 batch windows, the BSA/AML rules, the dual-auth requirements for wires. Those constraints are going to shape every story we generate."_

---

## Step 2 — Configure Tech Context (~45 sec)

1. Click Tech Context
2. Paste `technical-context.md` (or upload the file)

   > _"The architecture diagram shows the hybrid reality: Spring Boot microservices on AWS, talking to an on-prem AS/400 via IBM MQ and the FiServ Open Solutions API. The Banking Integration Hub is the translation layer — the only service allowed to write to AS/400. We also have Confluent Kafka on-prem, Okta for identity, FIS Worldpay for debit cards, NICE Actimize for AML. The platform will reference all of these by name in the generated stories."_

---

## Step 3 — Requirements Intake (~1 min)

1. Paste the requirements text from `requirements-prompt.md`
2. Click **Analyse / Start**

   > _"This covers account management, transfers (ACH, Zelle, RTP, wire), debit card controls, a new SMB business portal with role-based dual auth for ACH payroll, and the security/compliance layer. Phase 1 is 12 months; the AS/400 batch window constraint is explicitly called out — every story that touches a payment must handle the maintenance window gracefully."_

---

## Step 4 — Clarifying Questions (~1.5 min)

Walk through 2–3 questions. Suggested answers:

- **Primary users**: "Retail customers (1.2M), SMB owners and their authorised users (85K businesses), branch tellers (internal)"
- **Legacy constraint**: "IBM AS/400 FiServ Precision is the system of record; Banking Integration Hub is the only adapter; no COBOL changes allowed"
- **Batch window**: "AS/400 batch runs 00:00–04:00 CT nightly and 18:00 CT EOD; Payment Service must queue operations during these windows; UI shows a maintenance message"
- **Change management**: "SOX requires CAB approval for every production change; no Friday deployments after 15:00 CT"

---

## Step 5 — Epics (~1.5 min)

AI generates 5–7 epics. Expected: Account Management, Transfers & Payments, Debit Card Management, SMB Business Portal, Account Opening, Notifications & Alerts, Security & Authentication.

   > _"Look at the epic structure — it mirrors the strangler-fig approach. Account management is first because it's the read-heavy foundation. Transfers come next because they require real-time AS/400 integration via BIH. The SMB portal is its own epic because of the multi-user role complexity. And you won't see 'card management' mixed into payments — they're separated because card management goes through FIS Worldpay, not AS/400."_

Click **Generate Stories** on **Transfers & Payments**.

---

## Step 6 — Story Breakdown (~2 min)

Walk through 2–3 stories:

1. **Initiate ACH external transfer** — point out the SDIE 2:30 PM CT cut-off in AC, the NACHA return code translation requirement, the AS/400 batch window queue-and-retry behaviour, idempotency key via Redis
2. **Initiate domestic wire transfer** — point out dual authorisation (initiator + wire desk supervisor PIN), $10,000 threshold, BIH routing to AS/400 Fedwire module, 14:30 CT wire cut-off
3. Click **Generate Stories** on **SMB Business Portal** → show the role enforcement story: Initiator cannot be Approver on the same transaction, enforced at Payment Service API (not UI-only)

   > _"This is where the domain context pays off. The wire story knows about dual auth and the $10,000 threshold. The ACH story knows about the SDIE cut-off at 2:30 PM CT. The SMB role story specifies that the Payment Service — not just the frontend — enforces the Initiator/Approver segregation. You'd need a compliance-aware BA to catch all these in a traditional process."_

**Show the batch window story:**
- Find the story about handling transfers during maintenance — AC should reference the queue-and-retry pattern, the "Scheduled for after maintenance" message to customers, and the Redis idempotency key

---

## Step 7 — INVEST Validation (~45 sec)

Click the **Validate** tab on the "Handle AS/400 batch window" story or the wire initiation story.

   > _"The validator typically flags the batch window story as too broadly scoped — it's trying to handle queueing, retry logic, UI messaging, and monitoring in one story. The suggestion is to split into: 'Queue payment operation during batch window', 'Show customer maintenance message', and 'Alert on-call when retry queue exceeds threshold'."_

- Click **Fix with AI** → story focused on the queue mechanism; BIH and IBM MQ referenced in AC
- Accept the fix

---

## Step 8 — Export (~30 sec)

Export as **CSV** or **JIRA JSON**.

   > _"The backlog lands in JIRA with the AS/400 batch window constraints, the SOX change management notes, the BSA/AML audit trail requirements — all in the acceptance criteria. A bank compliance team would normally spend weeks reviewing stories for regulatory gaps. Here it's baked in from day one."_

---

## Key Talking Points

| Point | Evidence in demo |
|-------|----------------|
| Legacy constraint awareness | AS/400 batch window (00:00–04:00 CT) queue-and-retry appears in transfer stories |
| Strangler-fig pattern | BIH as the only AS/400 writer; services call BIH, not AS/400 directly — reflected in story AC |
| Hybrid architecture | Spring Boot + IBM MQ + Kafka on-prem + AWS — all referenced by name in stories |
| SOX compliance | Change management constraint in deployment-related stories; segregation of duties in SMB role stories |
| Dual auth for wires | Wire story captures initiator + Wire Desk supervisor approval as two separate authentication events |
| Regulatory precision | Reg E 10-business-day provisional credit, BSA 30-day SAR deadline, NACHA return code translations appear in relevant stories |
| No greenfield hand-waving | The AS/400 integration constraints make stories more realistic than generic banking templates |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Stories don't mention AS/400 or BIH | Ensure `technical-context.md` is loaded; BIH service reference must be in the tech context |
| Wire dual-auth not in AC | Ensure `domain-context.md` business rule 2 (wires > $10,000 require dual auth) is present |
| Batch window constraint missing | Re-check the requirements text includes the critical constraint paragraph at the end |
| Export greyed out | At least one epic with stories must be generated |
