# CrunchBite Digital — Customer & Operator Journey Map

**Document type**: UX Research / Business Analysis  
**Version**: 1.3  
**Owner**: CrunchBite Digital Product Team

---

## Overview

This document maps the primary journeys across both customer-facing and operator-facing touchpoints of the CrunchBite digital platform. It is the reference for story derivation, acceptance criteria definition, and sprint prioritisation.

---

## Journey 1 — Mobile Order-Ahead (Loyalty Member)

### Persona: Priya, 28, commuter, Gold-tier CrunchRewards member

**Goal**: Order her usual on the way to the office; earn points and apply a personalised offer.

| Step | Action | Service | Business rule |
|------|--------|---------|--------------|
| 1 | Opens CrunchBite app; biometric login | Identity Service | Session valid 30 days on trusted device |
| 2 | "Reorder" taps her saved favourite | Menu Service | Menu Service checks daypart — items available for current time slot |
| 3 | Offer banner shows "Free drink with any combo" | Loyalty Service | Offer personalised via Braze; validated against expiry and single-use flag |
| 4 | Applies offer; sees discount in cart | Loyalty Service | Only one offer per order; offer held (not consumed) until payment succeeds |
| 5 | Selects pickup store and 15-minute lead time | Order Service | Store Config Service confirms store is open and item is not 86'd |
| 6 | Pays with saved card (Adyen network token) | Payment Service | 3DS2 not required — recurring token above $25 exempt via MIT exemption |
| 7 | Order placed; Notification Service sends push | Notification Service | Push within 5 seconds of order confirmation |
| 8 | MICROS POS receives order; KDS ticket fires | Kitchen Service | KDS ticket within 3 seconds of order placed event on Kafka |
| 9 | Order ready; push notification sent | Notification Service | Order Service emits `order.ready` event; Notification Service reacts |
| 10 | Priya collects; points posted after 24h hold | Loyalty Service | 24-hour fraud hold before points visible in account |

**Acceptance criteria to derive:**
- Menu Service must validate daypart and 86-status at order time (not at browsing time)
- Offer held atomically at checkout; consumed only on payment success; released on payment failure
- KDS ticket must include modifier details and any allergy flags on the line item
- `order.ready` push notification must arrive within 10 seconds of kitchen bump

---

## Journey 2 — Kiosk Ordering (Unauthenticated Guest)

### Persona: Marcus, 45, walk-in customer, no loyalty account

**Goal**: Order lunch from the in-store kiosk quickly; pay by card tap.

| Step | Action | Service | Note |
|------|--------|---------|------|
| 1 | Approaches kiosk; attract screen shown | Kiosk app (local) | 60-second idle reset |
| 2 | Taps "Start Order" | Menu Service (cached) | Menu loaded from local SQLite cache (≤ 60 s old) |
| 3 | Browses All-Day menu; allergen info visible | Menu Service | FDA menu labelling — calories on menu, allergen on item detail |
| 4 | Adds Signature Burger + large fries; upsell prompt shown | Order Service | AI suggestive sell from Store Config (drinks upsell with burgers) |
| 5 | Taps card on Adyen terminal | Payment Service | Adyen Terminal API; card data never touches kiosk app |
| 6 | Receipt printed; order sent to MICROS and KDS | Order Service → Kitchen Service | MICROS is authoritative receipt and tax engine |
| 7 | Kiosk resets to attract screen | Kiosk app | 30-second soft prompt then reset |

**Kiosk offline scenario** (critical path):
- Network drops during step 2: kiosk serves cached menu; order placed locally
- Payment attempted: Adyen Terminal API offline → card tap still works (terminal has offline auth capability)
- Order queued locally; synced to Order Service + MICROS when network recovers (within 5 minutes)
- Staff alerted on expediter screen if order sync delayed > 3 minutes

**Acceptance criteria to derive:**
- Kiosk must load and display menu with no network for ≥ 5 minutes using local SQLite cache
- Allergen summary must appear on every item detail screen (not just on request)
- Adyen terminal offline auth must be supported; orders queued in kiosk local store
- MICROS sync failure must alert store manager on the admin dashboard within 1 minute

---

## Journey 3 — 86-Item Emergency (Store Manager)

### Persona: Damian, store manager, corporate store

**Goal**: Mark the Spicy Chicken Sandwich unavailable during the lunch rush; prevent orders already in flight from failing.

| Step | Action | Service | SLA |
|------|--------|---------|-----|
| 1 | Opens Store Manager app on tablet | Store Config Service | — |
| 2 | Navigates to "Menu → Item Availability" | Menu Service | — |
| 3 | Marks "Spicy Chicken Sandwich" as 86'd | Menu Service | Kafka event `item.86d` emitted within 1 second |
| 4 | Mobile app, web, kiosk show item greyed out | Menu Service → all channels | ≤ 60 seconds end-to-end |
| 5 | MICROS POS updated via MICROS REST API | Menu Service → MICROS | ≤ 60 seconds |
| 6 | Otter (delivery) updated; item removed from aggregator menu | Delivery Gateway → Otter | ≤ 60 seconds |
| 7 | Orders already in-flight with the item: Damian sees alert | Order Service | Orders placed before 86 are not cancelled automatically |
| 8 | Damian decides to fulfil existing orders; marks item back available when stock replenished | Menu Service | Re-availability propagates via same Kafka event |

**Acceptance criteria:**
- `item.86d` Kafka event must reach Menu Service cache invalidation within 1 second
- All consumer channels must reflect unavailability within 60 seconds (measured by E2E test)
- Orders placed before 86-event are not auto-cancelled; flagged to manager for decision
- Store Manager UI must show the count of in-flight orders containing the 86'd item

---

## Journey 4 — Franchise Owner Dashboard

### Persona: Linda, franchise owner of 8 CrunchBite stores

**Goal**: Review yesterday's performance before her morning franchisee call with the FBC.

| Step | Action | Service |
|------|--------|---------|
| 1 | Logs in to Franchise Portal | Identity Service (Cognito, franchisee pool) |
| 2 | Dashboard loads multi-store roll-up | Franchise Portal BFF → Analytics Service |
| 3 | Sees SOS (speed-of-service) average per store | Analytics Service (Snowflake / Kafka) |
| 4 | Clicks into store with SOS > 4 min | Analytics Service |
| 5 | Sees item-level breakdown: fry station causing delay | Analytics Service |
| 6 | Exports CSV report for FBC meeting | Franchise Portal BFF |

**Key metrics displayed:**
- Total transactions, net sales, average check, by store and roll-up
- Speed-of-service: average and p90 per hour, per store
- Top 10 items by volume; slow movers
- Loyalty redemption rate
- Void and refund rate (with drill-down by manager)

**Acceptance criteria:**
- Franchise Portal BFF must aggregate data across all stores owned by the authenticated franchise owner only (no cross-franchise data leakage)
- Dashboard data must reflect previous day's complete data (Snowflake updated by 06:00 local)
- CSV export must include store name, date range, all KPIs on the dashboard
- FBC users see all stores in their territory (multi-franchise roll-up)

---

## Journey 5 — Delivery Order (Uber Eats customer)

### Persona: James, ordering CrunchBite via Uber Eats app — not a CrunchBite member

**Goal**: Lunch delivery; never interacts with CrunchBite systems directly.

| Step | Action | Service | Note |
|------|--------|---------|------|
| 1 | Browses CrunchBite menu on Uber Eats | Otter (not CrunchBite) | Menu synced to Uber Eats via Otter |
| 2 | Places order on Uber Eats | Otter webhook → Delivery Gateway | Otter sends webhook within 2 s of order placement |
| 3 | Delivery Gateway acknowledges Otter webhook | Delivery Gateway | Must ACK within 3 s or Otter retries |
| 4 | Order injected into MICROS POS as type `DELIVERY` | Order Service → MICROS | Treated identically to native mobile order in kitchen |
| 5 | KDS ticket fires for kitchen | Kitchen Service | Same SOS targets apply |
| 6 | Uber Eats driver arrives; order handed off | — | CrunchBite has no further system interaction |
| 7 | Order marked `COLLECTED` in Order Service | Order Service | Triggers Analytics event for SOS reporting |

**86-item delivery sync:**
- When a store 86's an item, Otter must be notified within 60 seconds via Delivery Gateway
- Otter removes item from Uber Eats / DoorDash menu listing in their system
- Orders already accepted by aggregator before the 86 propagated: fulfilment decision by store manager

---

## Emotional Journey Summary

| Journey | High point | Low point | Opportunity |
|---------|-----------|-----------|-------------|
| Mobile order-ahead | "Done in 30 seconds; points applied" | Offer not applying due to already-used status | Real-time offer validity indicator before checkout |
| Kiosk | "Fast; no queue" | Network dropout → uncertainty whether order went through | Clear "Offline — order saved" indicator on kiosk screen |
| 86-item (manager) | "One tap and it's gone from every channel" | Unsure if in-flight orders are affected | Immediate count of affected in-flight orders in the alert |
| Franchise dashboard | "One view of all 8 stores" | Data is yesterday's — can't see today's lunch rush live | Near-real-time Kafka-fed dashboard for Phase 2 |
| Delivery | Seamless kitchen integration | Item mismatch between Otter menu and in-store 86 | Faster Otter menu sync; webhooks instead of polling |
