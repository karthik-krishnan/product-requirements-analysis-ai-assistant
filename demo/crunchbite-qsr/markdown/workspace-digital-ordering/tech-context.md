# CrunchBite — Digital Ordering Team: Technology Context

## Services Owned by This Team

| Service | Responsibility | Technology |
|---|---|---|
| **Order Service** | Cart management, order lifecycle (placed → in-kitchen → ready → collected), MICROS POS sync | Lambda + Aurora PostgreSQL 15 |
| **Menu Service** | Menu catalogue, daypart scheduling, LTO activation, 86-ing propagation, allergen data | Lambda + DynamoDB + ElastiCache Redis |
| **Payment Service** | Adyen session creation, capture, refund, saved card token management | Lambda + Adyen REST + Terminal API |
| **Delivery Gateway** | Otter webhook ingestion, order injection into kitchen queue, ETA proxy | Lambda + Otter REST API |

## Frontends Owned by This Team

| Client | Technology | Notes |
|---|---|---|
| **Mobile App** | React Native 0.74, Expo managed workflow | iOS 16+, Android 10+; Zustand for local state, React Query v5 for server state |
| **Web Ordering** | Next.js 14 (App Router, RSC) | Deployed to CloudFront + S3; shares cart logic with mobile via shared library |
| **Kiosk App** | Electron 30 + React 18 | Windows 10 IoT; offline SQLite cache for menu; Jotai for kiosk-specific atom store |

---

## Key Technical Constraints

### Menu Service
- DynamoDB (not PostgreSQL) — chosen for low-latency reads and DynamoDB Global Tables for multi-region menu replication
- Redis cache (ElastiCache) with a **60-second TTL** on menu responses; the 86-ing SLA depends on cache invalidation being triggered within 5 seconds of the `item.86d` Kafka event
- Menu data is read-heavy (millions of reads/day) and write-light (a few hundred LTO changes/week)

### Order Service
- Aurora PostgreSQL Serverless v2 with connection pooling via RDS Proxy
- Every order write is transactional: order record created + Kafka event produced atomically (using outbox pattern)
- MICROS POS is the **authoritative receipt and tax engine**: Order Service calls MICROS before marking order `COMPLETE`; if MICROS is unavailable, order is queued in SQS and retried with exponential backoff

### Payment Service
- Adyen REST API for online (app, web); Adyen Terminal API for in-person (kiosk card readers, drive-through)
- Idempotency key = `orderId`; prevents double-charge on Adyen retries
- No card data stored on CrunchBite infrastructure (SAQ-A scope)
- Refunds trigger a Kafka `payment.refunded` event consumed by the Loyalty Service to reverse any points awarded

### Delivery Gateway
- Otter sends webhooks with a 3-second acknowledgment requirement; Lambda function must respond within 2.5 seconds (500 ms buffer)
- Idempotency key = Otter order ID; duplicate webhooks are detected by checking the idempotency table in Redis before writing to Order Service

### Kiosk Offline Mode
- Local SQLite database on the kiosk device caches the full menu (updated every sync cycle)
- Orders placed offline are stored in a local queue and submitted to the Order Service when connectivity is restored
- Adyen Terminal API supports offline payment capture for up to **5 minutes** (configurable); offline payments are reconciled when the terminal reconnects

---

## External Integrations (this team)

| Integration | Protocol | Direction | Notes |
|---|---|---|---|
| **Oracle MICROS POS** | MICROS REST API + TCP socket | Order Service → MICROS | Order confirmation, receipt generation, tax calculation |
| **Adyen** | REST + Terminal API | Payment Service ↔ Adyen | All payment processing; SAQ-A scope |
| **Otter** | REST webhook (inbound) | Otter → Delivery Gateway | Delivery order injection; 3-second ACK SLA |
| **Infor CloudSuite F&B** | REST API (batch) | Menu Service ← Infor | Allergen, nutritional data, recipe updates |
| **Revel Systems** | REST API | Kiosk App → Revel | Kiosk software layer wrapping MICROS |
| **Google Maps Platform** | REST API | Mobile/Web → Maps | Store locator, delivery radius polygon, ETA |

---

## Non-Functional Requirements (this team)

| Category | Requirement |
|---|---|
| **Order latency** | p95 order placement < 800 ms end-to-end |
| **Menu load** | < 300 ms (CDN-cached); cache miss < 800 ms |
| **86-ing propagation** | ≤ 60 seconds from manager action to all channel updates |
| **Kiosk offline** | Accept orders for up to 5 minutes without network; sync on reconnect |
| **Otter ACK** | Webhook acknowledged within 3 seconds |
| **Throughput** | 2.4 M transactions/day; burst capacity for 3× normal during LTO promotions |
| **Availability** | 99.95% for Order, Payment, Menu services during peak (11 AM–2 PM, 5 PM–8 PM) |
