# Requirements Prompt — CrunchBite Digital Ordering Platform

## How to use this file

Copy the text inside the box below and paste it into the **Requirements Intake** screen of ProductPilot.
Upload `customer-journey.md` and `compliance-and-ops.md` to the **Domain Context** file upload area.
Paste or upload `domain-context.md` as domain text and `technical-context.md` as tech context.

---

## Requirements Text (paste this)

```
Build a unified digital ordering and loyalty platform for CrunchBite, a 1,000-store QSR chain.

The platform must cover the following capabilities:

1. MULTI-CHANNEL ORDERING
   - Mobile app (iOS + Android) with order-ahead for pickup and delivery
   - Web ordering with the same cart and menu as mobile
   - In-store kiosk ordering with offline fallback (5-minute network blip tolerance)
   - All channels must share a single menu, pricing, and inventory state managed by the Menu Service
   - Delivery orders from Uber Eats and DoorDash (via Otter middleware) must inject seamlessly into the same kitchen queue as native orders

2. MENU MANAGEMENT
   - Daypart-based menu visibility: Breakfast (open–10:30 AM), All-Day, Late Night (10 PM–close)
   - Store managers and corporate can 86 (mark unavailable) any item; propagation to all channels within 60 seconds
   - Limited Time Offers (LTOs) scheduled by corporate with activation/deactivation dates
   - Allergen and nutritional data displayed per FDA menu labelling requirements
   - Franchise stores may override price within ±10% of the corporate price book

3. LOYALTY — CRUNCHREWARDS
   - Earn 10 points per $1 spent (excluding tax, alcohol, fees)
   - Redeem points across reward tiers: $2 off, free item, limited merchandise
   - Tiered membership: Bronze, Silver, Gold — re-evaluated monthly
   - Personalised offers via Braze; one offer redeemable per order, single-use
   - Points held for 24 hours before posting (fraud hold); refunded orders forfeit points
   - Referral programme: 200 bonus points when referred friend completes first order

4. KITCHEN OPERATIONS
   - Orders routed to Epson KDS hardware, grouped by station (grill, fry, sandwich, beverage)
   - Expediter screen for order assembly
   - Bump and recall functionality; speed-of-service (SOS) timer shown to drive-through attendants
   - Target make time: 3 minutes standard, 5 minutes catering

5. PAYMENTS
   - Adyen for all payment channels: in-app, web, kiosk, drive-through
   - Saved card (network token) management in-app
   - 3DS2 required for card-not-present transactions above $25
   - PCI DSS SAQ-A scope (no card data on CrunchBite servers)

6. FRANCHISE & STORE MANAGEMENT
   - Real-time Speed-of-Service (SOS) dashboards per store
   - Franchise owner multi-store roll-up view: sales, SOS, top items, labour vs target
   - Store manager: void/refund controls (up to $75 without approval, above requires district manager PIN)
   - Store Config Service: manage store hours, delivery radius, feature flags per store
   - Automated NPS survey trigger via Medallia after every completed order

7. NOTIFICATIONS & COMMUNICATIONS
   - Order confirmation and ready-for-pickup notifications (push + SMS)
   - Loyalty points posted notification
   - Offer expiry reminders (3 days before)
   - All notifications via Braze; customers control channel preference (push / SMS / email)

8. CATERING / GROUP ORDERS
   - Minimum 10 items, 4-hour advance notice
   - Auto-assigned to the catering coordinator on duty at the selected store
   - Separate pickup time slot; kitchen KDS displays catering ticket on expediter screen only

The platform must integrate with:
- Oracle MICROS POS (in-store order confirmation and receipt)
- Adyen (payments)
- Braze (engagement and notifications)
- Otter (delivery aggregation for Uber Eats + DoorDash)
- Infor CloudSuite Food & Beverage (menu/allergen PIM and inventory)
- Epson KDS (kitchen display)
- Medallia (NPS)

Phase 1: channels 1–5 and loyalty (mobile, web, kiosk, MICROS sync, CrunchRewards, payments).
Phase 2: franchise dashboards, Medallia NPS, catering orders, drive-through AI upsell.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Primary users | Consumers (guests and loyalty members), store managers, franchise owners, kitchen staff |
| Compliance | PCI DSS SAQ-A (Adyen handles card data), CCPA (member data deletion/export), FDA allergen labelling |
| Key integrations | Oracle MICROS POS, Adyen, Otter (delivery), Braze (loyalty/marketing), Infor ERP (menu/PIM) |
| Offline requirements | Kiosk must accept orders for 5-minute network outage; SQLite local cache; sync on reconnect |
| Real-time requirements | 86-item propagation ≤ 60 s; KDS ticket delivery < 1 s; SOS timer accuracy ± 5 s |
| Release phasing | Phase 1 MVP: mobile, web, kiosk, loyalty, payments — 6 months; Phase 2: franchise dashboard, catering, LPR — month 10 |
| Analytics | Real-time SOS per store; franchise roll-up in Tableau via Snowflake; no individual-level PII in analytics |
