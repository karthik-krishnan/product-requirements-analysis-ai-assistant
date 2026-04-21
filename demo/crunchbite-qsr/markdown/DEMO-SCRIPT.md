# ProductPilot Demo Script — CrunchBite Digital Ordering Platform

**Time**: ~8 minutes end-to-end  
**Audience**: Product managers, engineering leads, QSR/retail prospects  
**Mode**: Demo provider (no API key required)  
**Differentiator vs healthcare demo**: Multi-channel COTS integration (Oracle MICROS, Adyen, Otter, Braze, Epson KDS), real-time 86-ing propagation, loyalty programme complexity

---

## Before You Start

Have this folder open in a file browser for drag-and-drop uploads.

| File | Used as | Upload to |
|------|---------|-----------|
| `domain-context.md` | Business domain knowledge | Domain Context — text or file upload |
| `technical-context.md` | Microservices + COTS architecture | Tech Context — text or file upload |
| `customer-journey.md` | Guest and operator journey maps | Domain Context — file upload |
| `compliance-and-ops.md` | PCI, FDA labelling, SLAs | Domain Context — file upload |
| `requirements-prompt.md` | Requirements text to paste | Requirements Intake screen |

---

## Step 1 — Configure Domain Context (~1 min)

1. Open Settings → confirm provider is **Demo**
2. Set Assistance Level to **Balanced**
3. Paste `domain-context.md` contents into the Domain Context text area
4. Drag `customer-journey.md` and `compliance-and-ops.md` into the file upload zone

   > _"This is a QSR chain — 1,000 stores, 2.4 million transactions a day. The domain context tells the platform about CrunchRewards loyalty tiers, the 60-second 86-item propagation SLA, Oracle MICROS integration, delivery via Otter middleware. These constraints will show up in acceptance criteria without us having to spell them out in the requirements."_

---

## Step 2 — Configure Tech Context (~45 sec)

1. Click Tech Context
2. Paste `technical-context.md` (or upload the file)

   > _"The architecture here is interesting — it's a mix of custom microservices (Order Service, Loyalty Service, Kitchen Service) and major COTS products: Oracle MICROS POS, Adyen for payments, Braze for loyalty campaigns, Otter for delivery aggregation, Epson KDS hardware. The tech context tells the platform these service names so they appear in story acceptance criteria."_

---

## Step 3 — Requirements Intake (~1 min)

1. Paste the requirements text from `requirements-prompt.md`
2. Click **Analyse / Start**

   > _"This covers multi-channel ordering (mobile, web, kiosk, delivery), menu management including daypart and 86-ing, CrunchRewards loyalty, kitchen operations with KDS integration, payments via Adyen, and franchise dashboards. Realistic product brief for a mid-market QSR digital programme."_

---

## Step 4 — Clarifying Questions (~1.5 min)

Walk through 2–3 questions. Suggested answers:

- **Primary users**: "Consumers (guests + loyalty members), store managers, franchise owners, kitchen staff"
- **Key integrations**: "Oracle MICROS POS, Adyen, Otter (Uber Eats + DoorDash), Braze, Epson KDS, Infor ERP for menu PIM"
- **Real-time requirements**: "86-item propagation ≤ 60 seconds across all channels; KDS ticket within 3 seconds of order placed"
- **Phasing**: "Phase 1: mobile, web, kiosk, loyalty, payments in 6 months; Phase 2: franchise dashboards, catering, drive-through LPR"

**Slider demo** (optional):
- Set to **Streamlined** → "Skip questions entirely — good for a team that already has a defined product brief"
- Reset to **Balanced** → proceed

---

## Step 5 — Epics (~1.5 min)

AI generates 5–7 epics. Expected: Multi-Channel Ordering, Menu Management & 86-ing, CrunchRewards Loyalty, Kitchen Operations & KDS, Payment Processing, Franchise & Store Management, Delivery Integration.

   > _"Notice how the epics map directly to the integration landscape — there's a dedicated Kitchen Operations epic because the KDS real-time constraint was prominent in the domain context. And Delivery Integration is its own epic because the Otter middleware has specific acknowledgement SLAs."_

Point out:
- Phase 1 / Phase 2 labels on epics reflecting the phasing from Q&A
- Tags referencing MICROS, Adyen, Braze, KDS — the COTS products

Click **Generate Stories** on **Menu Management & 86-ing**.

---

## Step 6 — Story Breakdown (~2 min)

Walk through 2–3 stories:

1. **86 an item from store manager app** — point out the 60-second propagation SLA in AC, the Kafka `item.86d` event, reference to Menu Service cache invalidation
2. **Display allergen info on kiosk** — point out FDA labelling requirement from the compliance doc appearing in AC, reference to Infor PIM as the source
3. Click **Generate Stories** on **CrunchRewards Loyalty** to show the loyalty programme complexity: 24-hour fraud hold, single-offer-per-order rule, Braze offer validation

   > _"This is what makes the context investment worthwhile. The story for 'Apply loyalty offer at checkout' knows about the 24-hour point hold, the one-offer-per-order rule, and references the Loyalty Service and Payment Service by name. Without context those would be generic placeholders."_

**Show story editing**:
- Click **Split Story** on a larger story → AI sub-divides it
- Show **INVEST validation** on a story with multiple concerns → fix suggestion referencing the 60-second SLA

---

## Step 7 — INVEST Validation (~45 sec)

Click the **Validate** tab on a complex story (e.g., "Propagate item unavailability to all channels").

   > _"The validator calls out that this story is too large — it crosses three services (Menu Service, Delivery Gateway, MICROS) and should be split by channel. It's caught the cross-service coupling that would cause integration headaches in the sprint."_

- Click **Fix with AI** → revised story focuses on one channel; AC references the 60-second SLA

---

## Step 8 — Export (~30 sec)

Export as **CSV** or **JIRA JSON**.

   > _"Backlog ready for sprint planning. The MICROS integration stories, the Adyen payment stories, the KDS ticket delivery stories — all with acceptance criteria that reference the right services and SLAs. A BA and a tech lead could've spent two sprints getting here."_

---

## Key Talking Points

| Point | Evidence in demo |
|-------|----------------|
| COTS product awareness | Oracle MICROS, Adyen, Braze, Epson KDS, Otter appear in story AC by name |
| Real-time SLA in stories | 60-second 86-propagation, 3-second KDS ticket, 3-second Otter ACK in AC |
| Compliance in stories | FDA allergen display, PCI SAQ-A scope, CCPA data deletion appear in relevant stories |
| Multi-channel complexity | Separate stories per channel for 86-ing — AI spotted the cross-service coupling |
| Loyalty nuance | 24-hour fraud hold, single offer per order, Braze integration in loyalty stories |
| Franchise multi-tenancy | Franchise Portal BFF stories reference data isolation between franchise owners |
