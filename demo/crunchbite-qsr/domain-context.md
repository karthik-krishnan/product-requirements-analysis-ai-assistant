# CrunchBite — Domain Context

## About the Organisation

**CrunchBite** is a fast-casual QSR (Quick Service Restaurant) chain operating **680 corporate stores** and **320 franchise locations** across North America, with international expansion underway in the UK and Australia. The brand serves approximately **2.4 million transactions per day** across dine-in, drive-through, mobile order-ahead, and delivery channels.

CrunchBite's digital division — **CrunchBite Digital** — owns the customer-facing mobile app, web ordering platform, loyalty programme, and the in-store digital experience (kiosks, kitchen display systems, digital menu boards).

---

## Business Domain Concepts

### User Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Guest (unauthenticated)** | Walk-in customer ordering at kiosk or counter | Fast ordering, accurate order, minimal friction |
| **Member** | Loyalty programme participant | Points earn/redeem, personalised offers, order history |
| **Franchise Owner** | Owner of 1–15 franchise stores | Store performance dashboards, labour/food cost alerts |
| **Store Manager** | Manages one corporate store | Shift scheduling, void/refund controls, end-of-day reports |
| **Kitchen Staff** | Prepares orders | Clear order queue, modifier visibility, bump/recall |
| **Drive-Through Attendant** | Takes and hands off drive-through orders | Queue time, order status, upsell prompts |
| **Marketing Manager** | Corporate marketing team | Campaign management, segment targeting, A/B test offers |
| **Franchise Business Consultant (FBC)** | CrunchBite field rep supporting franchisees | Multi-store roll-up dashboards, compliance scoring |

### Ordering Channels

- **Mobile App (Order-Ahead)** — iOS and Android; pickup or delivery; supports scheduled orders
- **Web Ordering** — same menu and cart as mobile; primarily desktop/tablet
- **In-Store Kiosk** — Windows-based JAWS-accessible touch kiosk; 30-second idle reset
- **Drive-Through (POS at window)** — Oracle MICROS POS; licence plate recognition (LPR) integration (Phase 2)
- **Delivery Aggregators** — Uber Eats, DoorDash, Grubhub via middleware (Otter); orders injected into kitchen as if native
- **Catering / Group Orders** — minimum 10 items, 4-hour advance notice, assigned to catering coordinator role

### Menu & Catalogue

- Menu items organised by **daypart**: Breakfast (open–10:30 AM), All-Day, Late Night (10 PM–close)
- **Limited Time Offers (LTOs)** scheduled by corporate; activate/deactivate by date and store
- **86'ing** (item unavailability): store manager marks item unavailable; propagates to all channels within 60 seconds
- Modifier groups: required (size, protein) and optional (sauces, toppings); max 12 modifiers per item
- Nutritional and allergen data attached to every menu item; mandatory display on kiosk and web
- **Price book** managed centrally; franchise stores can override price within ±10% band

### Loyalty Programme — CrunchRewards

- **Earn**: 10 points per $1 spent (excluding tax, fees, alcohol)
- **Redeem**: points exchanged for reward tiers ($2 off / free item / limited merchandise)
- **Tiers**: Bronze (0–499 pts), Silver (500–1999 pts), Gold (2000+ pts); tier re-evaluated monthly
- **Offers**: personalised via Braze; segments by tier, visit frequency, favourite items, location
- **Referral**: member earns 200 bonus points when referred friend places first order
- Points expire after **12 months** of inactivity
- **Fraud rules**: maximum 3 points transactions per day per account; LPR-linked duplicate detection (Phase 2)

### Kitchen Operations

- Orders flow to **Kitchen Display System (KDS)** — Epson KDS hardware running CrunchBite KDS app
- Order shown as **tickets** grouped by station: grill, fry, sandwich, beverage
- **Make time target**: 3 minutes for standard orders, 5 minutes for catering items
- **Expediter screen** consolidates all station outputs for order assembly
- **Bump**: kitchen staff taps item when ready; ticket clears when all items bumped
- **Recall**: last 20 bumped tickets accessible for re-display
- **Speed of Service (SOS)**: order-placed → order-ready timer shown to drive-through attendant

### Drive-Through

- Dual-lane drive-through at 240 of the 680 corporate stores
- Average drive-through transaction time target: **3 minutes 30 seconds** (order-to-window)
- **AI suggestive selling**: upsell prompt shown on Order Confirmation Unit (OCU) based on order content and daypart
- **Order Confirmation Unit (OCU)**: customer-facing display at order point; shows cart in real time

### Delivery

- Delivery orders fulfilled by Uber Eats and DoorDash drivers; aggregated via **Otter** middleware
- Otter injects delivery orders into Oracle MICROS POS as type `DELIVERY`
- Estimated delivery time displayed in app; sourced from aggregator API
- **Delivery radius**: configured per store (default 3 miles); can be reduced during peak/rush

---

## Compliance & Regulatory Context

### PCI DSS v4.0
- Cardholder data handled exclusively by **Adyen** (payment gateway); CrunchBite systems are SAQ-A (no card data on own servers)
- Tokenisation: Adyen returns a reusable network token per saved card; stored in Loyalty Service
- 3DS2 required for all card-not-present transactions above $25

### CCPA / US State Privacy Laws
- Members may request data export, correction, or deletion
- Marketing opt-out must be honoured within 15 business days
- "Do Not Sell or Share My Personal Information" link required on all web properties

### Allergen & Nutritional Labelling
- US: FDA menu labelling rule — calorie counts mandatory on menus with >20 locations
- UK: Natasha's Law — full ingredient and allergen list mandatory on all packaged items
- Per-item allergen data sourced from Product Information Management (PIM) system; displayed on kiosk, app, and web

### Accessibility
- WCAG 2.1 AA on web and mobile app
- ADA kiosk compliance: accessibility mode activates via physical button; JAWS-compatible
- UK: Equality Act 2010 — equivalent standard for UK digital properties

---

## Business Rules

1. A member may apply **one offer per order**; offers are single-use and expire on the campaign end date
2. Points earned on an order are **held for 24 hours** before posting (fraud hold); refunded orders forfeit points
3. Store managers may void orders up to **$75 without approval**; above $75 requires district manager PIN
4. **86-ing** an item propagates to all channels within **60 seconds** via the Menu Service event
5. Kiosk sessions idle for **30 seconds** show a soft prompt; idle for **60 seconds** reset to the attract screen
6. Delivery orders received **after store close time minus 15 minutes** are auto-rejected with guest notification
7. Catering orders require **4-hour lead time** and a minimum of **10 items**; assigned automatically to the catering coordinator on duty
8. A franchise store's price override must stay within **±10%** of the corporate price book value

---

## Integration Landscape

| System | Purpose | Protocol |
|---|---|---|
| **Oracle MICROS POS** | In-store point of sale, order management | MICROS REST API / TCP socket |
| **Adyen** | Payment processing (all channels) | Adyen REST + Terminal API |
| **Braze** | Customer engagement, push/email/SMS campaigns | REST API + Braze SDK |
| **Otter** | Delivery aggregator middleware (Uber Eats, DoorDash, Grubhub) | REST API (webhook inbound) |
| **Epson KDS** | Kitchen display system hardware | WebSocket (CrunchBite KDS app) |
| **Revel Systems** | Kiosk software layer (wraps MICROS) | REST API |
| **Infor CloudSuite Food & Beverage** | Inventory, procurement, recipe management (ERP) | REST API + batch file export |
| **Medallia** | Guest satisfaction survey and NPS | REST API (post-transaction trigger) |
| **Tableau / Snowflake** | Analytics, franchise dashboards | JDBC / Snowflake Connector |
| **Google Maps Platform** | Store locator, delivery radius, ETA | REST API |
