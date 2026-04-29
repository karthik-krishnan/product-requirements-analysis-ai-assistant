# CrunchBite — Digital Ordering Team: Domain Context

## Team Scope

The Digital Ordering Team owns the **guest-facing ordering experience** across mobile (iOS + Android), web, in-store kiosk, and delivery aggregator channels. The team also owns the **Menu Service** (menu catalogue, daypart scheduling, 86-ing propagation) and the **Payment Service** (Adyen integration).

---

## Team Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Guest (unauthenticated)** | Walk-in or first-time customer ordering without an account | Fast ordering, accurate cart, minimal friction, no forced account creation |
| **Member** | Logged-in CrunchRewards loyalty member | Points visible in cart, seamless offer redemption, saved card, order history |
| **Kiosk User** | Customer at an in-store self-service kiosk | Large touch targets, allergen information, 30-second idle reset, accessibility mode |
| **Delivery Customer** | Customer ordering via Uber Eats / DoorDash (order injected via Otter) | Accurate ETA, correct menu representation, delivery-specific item availability |

---

## Ordering Channels

### Mobile App (Order-Ahead)
- iOS 16+ and Android 10+; React Native 0.74 / Expo managed workflow
- Supports pickup (at store) and delivery (via aggregators)
- Scheduled orders: customer can place up to 4 hours in advance, specifying a pickup time
- Guest checkout supported (no account required); MRN tied to device fingerprint for fraud velocity

### Web Ordering
- Next.js 14 (App Router, React Server Components); deployed to CloudFront + S3
- Identical menu and cart logic to mobile; primarily used on desktop and tablet
- Shares the same Order Service backend as mobile

### In-Store Kiosk
- Electron 30 wrapping a React app; runs on Windows 10 IoT hardware at the store
- **Offline capability**: kiosk must serve the full menu and accept orders during up to a **5-minute network outage** using a local SQLite menu cache; orders are queued and synced when connectivity is restored
- Idle reset: soft prompt at 30 seconds, hard reset to attract screen at 60 seconds
- ADA accessibility mode: activated via physical button; large text, JAWS-compatible, high-contrast mode

### Delivery Aggregators
- Uber Eats, DoorDash, and Grubhub orders are aggregated via **Otter** middleware
- Otter sends orders as webhooks; Delivery Gateway must acknowledge within **3 seconds** or Otter retries
- Delivery orders are injected into the kitchen queue identically to native orders (type: `DELIVERY`)
- Delivery radius is configured per store (default 3 miles); automatically reduced when order volume is high

---

## Menu Management

### Catalogue Structure
- Items organised by **daypart**: Breakfast (open–10:30 AM), All-Day, Late Night (10 PM–close)
- Modifier groups: required (size, protein) and optional (sauces, toppings); maximum 12 modifiers per item
- Nutritional and allergen data attached to every item; sourced from **Infor PIM**; mandatory display on kiosk and web
- **Limited Time Offers (LTOs)**: scheduled by corporate with activation/deactivation dates; enabled per store or region via LaunchDarkly flags
- **Price book**: managed centrally; franchise stores can override within ±10% band (Store Config Service)

### 86-ing (Item Unavailability)
- A store manager marks an item unavailable via the Manager Dashboard
- The Menu Service emits an `item.86d` Kafka event that must reach all channels (app, web, kiosk, MICROS) within **60 seconds**
- The Menu Service invalidates the Redis cache for the affected store immediately on the event
- 86-ing is **store-specific**: an item unavailable at one store remains available at others

---

## Payments

- All payment processing handled by **Adyen**; CrunchBite systems are PCI DSS SAQ-A scope (no card data on own servers)
- **Saved cards**: Adyen returns a reusable network token per card; stored in Loyalty Service against the member's account
- **Guest checkout**: Adyen session created per order; no token stored
- **3DS2**: required for card-not-present transactions above $25
- **Drive-through**: Adyen Terminal API for physical card readers at window; same backend Payment Service

---

## Catering / Group Orders

- Minimum 10 items; 4-hour advance notice required
- Customer selects a pickup time slot (displayed in 30-minute windows)
- Assigned automatically to the **catering coordinator on duty** at the selected store
- Kitchen KDS displays catering ticket on expediter screen only (not individual station screens)

---

## Business Rules Specific to Ordering

1. An order is only confirmed to the customer **after MICROS POS acknowledges receipt** from the Order Service
2. Kiosk offline mode: accept orders for up to **5 minutes** without network connectivity; sync on reconnect
3. Delivery orders received after **store close time minus 15 minutes** are auto-rejected with a guest notification
4. **Idempotency**: each order has a unique `orderId`; duplicate submissions (network retry) are detected by the Payment Service via idempotency key
5. Otter webhook acknowledgment must occur within **3 seconds**; if not, Otter retries — idempotency key = Otter order ID
6. LTO items that are 86'd during an active promotion show as "sold out today" rather than disappearing from the menu
