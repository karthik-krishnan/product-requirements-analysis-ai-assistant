# CrunchBite Corp — Enterprise Domain Context

## About the Organization

**CrunchBite Corp** is a fast-casual QSR (Quick Service Restaurant) chain operating **680 corporate stores** and **320 franchise locations** across North America, with international expansion underway in the UK and Australia. The brand processes approximately **2.4 million transactions per day** across dine-in, drive-through, mobile order-ahead, kiosk, and delivery channels, generating approximately **$3.8 billion in annual revenue**.

CrunchBite's technology organization is structured into three product teams that share a common platform:
- **Digital Ordering Team** — guest-facing mobile, web, and kiosk ordering experience
- **Loyalty & Rewards Team** — CrunchRewards programme, personalised offers, and member engagement
- **Kitchen & Operations Team** — in-store kitchen display, speed-of-service, and store operations tools

All three teams build on a shared AWS microservices platform, a common event bus (Apache Kafka on MSK), and a central identity layer (AWS Cognito).

---

## Enterprise User Personas

| Persona | Team | Description |
|---|---|---|
| **Guest (unauthenticated)** | Digital Ordering | Walk-in customer ordering at kiosk or counter; no account required |
| **Member** | Digital Ordering / Loyalty | Loyalty programme participant with a CrunchRewards account |
| **Kitchen Staff** | Kitchen & Operations | Prepares orders; interacts with KDS hardware |
| **Drive-Through Attendant** | Kitchen & Operations | Takes and hands off drive-through orders |
| **Store Manager** | Kitchen & Operations | Manages one corporate store; holds void/refund authority |
| **Franchise Owner** | Kitchen & Operations | Owns 1–15 franchise stores; monitors performance dashboards |
| **Marketing Manager** | Loyalty | Corporate marketing team; manages campaigns and segments |
| **Franchise Business Consultant (FBC)** | Kitchen & Operations | CrunchBite field rep supporting multiple franchisees |

---

## Corporate + Franchise Model

- **Corporate stores** (680): operated directly by CrunchBite Corp; all technology mandated
- **Franchise stores** (320): independently owned under a franchise agreement; use the same POS, KDS, and ordering stack; price overrides permitted within ±10% of the corporate price book
- Franchise owners receive a separate dashboard with multi-store roll-up views; they cannot modify menu data or corporate LTOs
- **Franchise Business Consultants (FBCs)** each manage a territory of 15–30 franchise stores and require aggregated compliance and performance views

---

## Company-Wide Business Rules

1. A member may apply **one offer per order**; offers are single-use and expire on the campaign end date
2. Points earned on an order are **held for 24 hours** before posting (fraud hold); refunded orders forfeit points
3. **86-ing** (marking an item unavailable) must propagate to all ordering channels within **60 seconds**
4. Store managers may void orders up to **$75 without approval**; above $75 requires a district manager PIN
5. Delivery orders received **after store close time minus 15 minutes** are auto-rejected with guest notification
6. Catering orders require a **4-hour lead time** and a minimum of **10 items**
7. A franchise store's price override must stay within **±10%** of the corporate price book value
8. All in-store POS transactions must be confirmed with **Oracle MICROS** before being marked `COMPLETE`

---

## Company-Wide Compliance & Regulatory Framework

### PCI DSS v4.0
- Cardholder data handled exclusively by **Adyen**; CrunchBite systems are SAQ-A scope
- Tokenization: Adyen returns a reusable network token per saved card; stored in Loyalty Service
- 3DS2 required for all card-not-present transactions above $25

### CCPA / US State Privacy Laws
- Members may request data export, correction, or deletion
- Marketing opt-out must be honoured within 15 business days
- "Do Not Sell or Share My Personal Information" link required on all web properties

### Allergen & Nutritional Labelling
- **US**: FDA menu labelling rule — calorie counts mandatory on menus at chains with >20 locations
- **UK**: Natasha's Law — full ingredient and allergen list mandatory on all packaged items
- Per-item allergen data sourced from **Infor CloudSuite Food & Beverage (PIM)**; displayed on kiosk, app, and web

### Accessibility
- WCAG 2.1 AA on all web and mobile interfaces
- ADA kiosk compliance: accessibility mode activates via physical button; JAWS-compatible
- UK Equality Act 2010 equivalent standard for UK digital properties

---

## Enterprise Integration Landscape

| System | Purpose | Owner Team |
|---|---|---|
| **Oracle MICROS POS** | In-store point of sale, order management, receipt, tax engine | Kitchen & Operations |
| **Adyen** | Payment processing across all channels | Digital Ordering |
| **Braze** | Customer engagement, push/email/SMS campaigns, A/B testing | Loyalty |
| **Otter** | Delivery aggregator middleware (Uber Eats, DoorDash, Grubhub) | Digital Ordering |
| **Epson KDS** | Kitchen display system hardware | Kitchen & Operations |
| **Infor CloudSuite F&B** | Inventory, procurement, recipe management, allergen/nutrition PIM | Kitchen & Operations |
| **Revel Systems** | Kiosk software layer (wraps MICROS) | Digital Ordering |
| **Medallia** | Guest satisfaction survey and NPS | Kitchen & Operations |
| **Snowflake** | Enterprise data warehouse; analytics and franchise dashboards | All teams (read) |
| **Tableau** | Franchise and operations dashboards | Kitchen & Operations |
| **Google Maps Platform** | Store locator, delivery radius, ETA | Digital Ordering |
| **LaunchDarkly** | Feature flags — gates LTO activations and new features per store | All teams |
