# Requirements Prompt — CrunchBite Digital Ordering Team

## How to use this file

1. In ProductPilot, go to **Settings → Enterprise Context** and paste the contents of `enterprise/enterprise-domain-context.md` into the Domain Context field. Paste `enterprise/enterprise-tech-context.md` into the Tech Context field.
2. Select or create the **Digital Ordering** workspace. Paste `workspace-digital-ordering/domain-context.md` into its Domain Context field and `workspace-digital-ordering/tech-context.md` into its Tech Context field.
3. Copy the requirements text below and paste it into the **Requirements Intake** screen.

---

## Requirements Text (paste this)

```
Build a unified multi-channel digital ordering platform for CrunchBite covering the mobile app (iOS + Android),
web ordering, in-store kiosk, and delivery aggregator integration.

Scope for this initiative:

1. MULTI-CHANNEL ORDERING EXPERIENCE
   - Mobile app order-ahead (pickup and delivery) with scheduled order support up to 4 hours in advance
   - Web ordering with identical menu, cart, and checkout to mobile (Next.js)
   - In-store kiosk ordering (Electron on Windows 10 IoT) with:
     - Offline fallback: accept orders during up to a 5-minute network outage using local SQLite cache
     - ADA accessibility mode (JAWS-compatible, high-contrast, large text) via physical button
     - 30-second idle soft prompt; 60-second hard reset to attract screen
   - Delivery orders from Uber Eats and DoorDash injected via Otter middleware into the same kitchen queue as native orders

2. MENU MANAGEMENT
   - Daypart-based menu visibility: Breakfast (open–10:30 AM), All-Day, Late Night (10 PM–close)
   - Real-time 86-ing: store manager marks an item unavailable; all channels (app, web, kiosk, MICROS) updated within 60 seconds
   - LTO scheduling: corporate activates Limited Time Offers by date range; feature-flagged per store/region via LaunchDarkly
   - Allergen and nutritional data displayed per FDA menu labelling requirements; sourced from Infor PIM
   - Franchise price overrides: store can apply a price within ±10% of the corporate price book

3. PAYMENTS
   - Adyen for all payment channels: in-app, web, kiosk (card reader via Adyen Terminal API), drive-through
   - Saved card (network token) management for members
   - 3DS2 required for card-not-present transactions above $25
   - PCI DSS SAQ-A scope: no card data on CrunchBite servers; Adyen handles all cardholder data
   - Order is only confirmed to the customer after MICROS POS acknowledges receipt

4. CATERING / GROUP ORDERS
   - Minimum 10 items; 4-hour advance notice required
   - Customer selects a pickup time slot shown in 30-minute windows
   - Auto-assigned to the catering coordinator on duty at the selected store
   - Catering ticket displayed on the expediter screen in the KDS (not individual station screens)

The platform must integrate with:
- Oracle MICROS POS (order confirmation, receipt, tax engine)
- Adyen (all payment processing — REST and Terminal API)
- Otter (delivery order aggregation — Uber Eats, DoorDash, Grubhub)
- Infor CloudSuite Food & Beverage (allergen and nutritional data)
- Revel Systems (kiosk software layer)
- Google Maps Platform (store locator, delivery radius, ETA)
- AWS Cognito (identity — shared with platform)
- Apache Kafka MSK (domain events — shared platform event bus)

Phase 1: mobile app, web ordering, menu management, Adyen payments, MICROS sync.
Phase 2: kiosk (Electron), catering orders, Otter delivery integration, offline kiosk mode.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Primary channel priority | Mobile app first, then web and kiosk in parallel; delivery via Otter is Phase 2 |
| Guest vs member checkout | Both must be supported; guest checkout uses a device-scoped token; no forced account creation |
| Offline requirement | Kiosk offline mode is a hard requirement: 5-minute tolerance, SQLite local cache, sync on reconnect |
| MICROS dependency | MICROS is the authoritative tax and receipt engine; Order Service must confirm with MICROS before marking order complete; MICROS unavailability routes orders to a retry queue |
| 86-ing SLA | 60-second propagation to all channels is a hard SLA; Redis cache must be invalidated within 5 seconds of the Kafka event |
| LTO management | LTOs are scheduled by corporate and toggled per store/region via LaunchDarkly feature flags; no store-level creation of LTOs |
| Phasing | Phase 1 MVP in 6 months: mobile, web, menu management, Adyen, MICROS sync; Phase 2: kiosk, catering, Otter delivery |
