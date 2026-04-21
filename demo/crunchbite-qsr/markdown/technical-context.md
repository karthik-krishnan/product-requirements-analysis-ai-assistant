# CrunchBite Digital — Technical Context

## Platform Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                      │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Mobile App  │  │  Web Order   │  │    Kiosk     │  │  Franchise /    │  │
│  │ (React Native│  │  (Next.js 14 │  │  (Electron + │  │  Store Manager  │  │
│  │  iOS/Android)│  │   SSR / RSC) │  │   React)     │  │  Dashboard      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │  (React SPA)    │  │
│         │                 │                 │           └────────┬────────┘  │
└─────────┼─────────────────┼─────────────────┼────────────────────┼───────────┘
          │  HTTPS + WSS    │                 │  local TCP/WS      │ HTTPS
┌─────────▼─────────────────▼─────────────────▼────────────────────▼───────────┐
│                   API GATEWAY — AWS API Gateway + CloudFront CDN              │
│        JWT (Cognito)  •  Rate limits  •  WAF OWASP rules  •  mTLS (B2B)      │
└────────┬──────────┬──────────┬─────────────┬─────────────┬────────────────────┘
         │          │          │             │             │
┌────────▼──┐  ┌────▼─────┐  ┌▼──────────┐  ┌▼──────────┐  ┌▼──────────────┐
│  Identity │  │  Order   │  │  Menu     │  │  Loyalty  │  │  Notification │
│  Service  │  │  Service │  │  Service  │  │  Service  │  │  Service      │
│           │  │          │  │           │  │           │  │               │
│ Cognito + │  │PostgreSQL│  │  DynamoDB │  │PostgreSQL │  │  Braze SDK +  │
│ Lambda    │  │+ Lambda  │  │+ Lambda   │  │+ Lambda   │  │  SQS + Lambda │
└─────┬─────┘  └────┬─────┘  └────┬──────┘  └─────┬─────┘  └───────────────┘
      │             │             │               │
┌─────▼─────────────▼─────────────▼───────────────▼───────────────────────────┐
│                     DOMAIN EVENT BUS — Apache Kafka (MSK)                    │
│   order.placed  •  order.ready  •  item.86d  •  points.earned  •  offer.used │
│   payment.completed  •  delivery.dispatched  •  shift.opened  •  menu.updated│
└──────┬───────────────────┬──────────────────────┬────────────────────────────┘
       │                   │                      │
┌──────▼──────┐   ┌────────▼──────┐    ┌──────────▼──────────────────────────┐
│  Kitchen    │   │  Payment      │    │  COTS / Third-Party Services         │
│  Service    │   │  Service      │    │                                      │
│             │   │               │    │  ┌───────────┐  ┌───────────────┐    │
│ KDS app on  │   │  Adyen API    │    │  │Oracle     │  │  Otter        │    │
│ Epson HW    │   │  + Lambda     │    │  │MICROS POS │  │  (delivery    │    │
│ WebSocket   │   │               │    │  │           │  │   middleware) │    │
└─────────────┘   └───────────────┘    │  └───────────┘  └───────────────┘    │
                                       │  ┌───────────┐  ┌───────────────┐    │
                                       │  │  Infor    │  │  Medallia     │    │
                                       │  │  ERP/PIM  │  │  (NPS/CSAT)  │    │
                                       │  └───────────┘  └───────────────┘    │
                                       └─────────────────────────────────────-┘
```

## Services Reference

| Service | Responsibility | Technology |
|---|---|---|
| **Identity Service** | Customer registration, login, MFA, guest checkout tokens, social sign-in | AWS Cognito + Lambda (Node.js 20) |
| **Order Service** | Cart management, order lifecycle (placed → in-kitchen → ready → collected), POS sync | Lambda + PostgreSQL 15 (Aurora Serverless v2) |
| **Menu Service** | Menu catalogue, daypart scheduling, LTO activation, 86-ing propagation, allergen data | Lambda + DynamoDB + ElastiCache Redis |
| **Loyalty Service** | Points earn/redeem, tier calculation, offer validation, fraud velocity checks | Lambda + PostgreSQL 15 |
| **Payment Service** | Adyen session creation, capture, refund, saved card token management | Lambda + Adyen Terminal API |
| **Kitchen Service** | KDS ticket delivery, station routing, bump/recall, SOS timer | Lambda + WebSocket API Gateway + Epson KDS |
| **Notification Service** | Push notifications (FCM/APNs), SMS (Twilio), email (SendGrid), in-app inbox | Lambda + SQS FIFO + Braze SDK |
| **Analytics Service** | Real-time SOS metrics, item-level sales, franchise roll-up, Tableau feed | Kafka → Snowflake Connector |
| **Delivery Gateway** | Otter webhook ingestion, order injection, ETA proxy | Lambda + Otter REST API |
| **Store Config Service** | Store hours, delivery radius, price overrides, feature flags per store | Lambda + DynamoDB |
| **Catering Service** | Group order management, coordinator assignment, lead-time validation | Lambda + PostgreSQL 15 |
| **Franchise Portal BFF** | Backend-for-frontend for franchise dashboard; multi-store aggregation | Lambda + GraphQL (Apollo Server) |

## Tech Stack

### Customer-Facing Frontend
- **Mobile**: React Native 0.74 (iOS 16+, Android 10+); Expo managed workflow
- **Web ordering**: Next.js 14 (App Router, React Server Components); deployed to CloudFront + S3
- **Kiosk**: Electron 30 wrapping a React app; runs on Windows 10 IoT; offline-capable (SQLite local cache for menu)
- **Franchise / Manager Dashboard**: React 18 SPA + Apollo Client; Tailwind CSS + Radix UI components
- **State management**: Zustand (local UI state); React Query v5 (server state); Jotai (kiosk-specific atom store)

### Backend
- **Runtime**: Node.js 20 LTS on AWS Lambda (arm64 Graviton3)
- **API style**: REST (customer-facing); GraphQL (franchise BFF); WebSocket (KDS real-time)
- **Auth**: JWT RS256 via Cognito User Pools; anonymous guest token (scoped JWT, 4-hour TTL) for unauthenticated ordering
- **Primary database**: Amazon Aurora PostgreSQL 15 Serverless v2 (Order, Loyalty, Catering services)
- **Document / catalogue store**: DynamoDB (Menu Service — low-latency read, global tables for multi-region)
- **Cache**: ElastiCache Redis 7 — menu cache (TTL 60 s), session store, idempotency keys for payment
- **Event streaming**: Amazon MSK (Kafka 3.6) — domain events, SOS metrics, Snowflake CDC
- **Queue**: SQS FIFO (Notification Service dispatch, order injection from Otter)

### COTS Products in the Stack

| Product | Role | Integration point |
|---|---|---|
| **Oracle MICROS POS** | In-store POS, receipt printing, drawer management | Order Service → MICROS REST API + TCP socket |
| **Adyen** | All payment processing (app, web, kiosk, drive-through) | Payment Service → Adyen REST + Terminal API |
| **Braze** | Campaign management, segmented push/email/SMS, A/B testing | Notification Service + Loyalty Service → Braze REST SDK |
| **Otter** | Delivery order aggregation (Uber Eats, DoorDash, Grubhub) | Delivery Gateway ← Otter webhook |
| **Infor CloudSuite F&B** | Inventory, procurement, recipe/PIM | Menu Service ← Infor REST API (allergen, nutrition) |
| **Revel Systems** | Kiosk software layer; wraps MICROS | Kiosk App → Revel API |
| **Epson KDS** | Kitchen Display hardware | Kitchen Service → WebSocket push |
| **Medallia** | NPS and guest CSAT surveys triggered post-transaction | Analytics Service → Medallia REST |
| **Snowflake** | Enterprise data warehouse; franchise and ops analytics | Kafka → Snowflake Kafka Connector |
| **Tableau** | Franchise dashboards, SOS trend analysis | Snowflake → Tableau |

### Infrastructure & DevOps
- **Cloud**: AWS (us-east-1 primary; us-west-2 failover for Order + Payment services)
- **IaC**: AWS CDK v2 TypeScript; all resources version-controlled; no click-ops
- **CI/CD**: GitHub Actions — lint → test (unit + integration) → E2E (Playwright) → deploy staging → manual promote to prod
- **Container registry**: Amazon ECR; Lambda deployed as container images
- **Secrets**: AWS Secrets Manager; Adyen API key, Braze REST key, MICROS credentials rotated quarterly
- **Observability**: AWS CloudWatch + X-Ray; Datadog APM for cross-service tracing; PagerDuty for P1/P2 alerts
- **Feature flags**: LaunchDarkly — used to gate LTO activations, new menu features, and kiosk UI experiments

### Key Architectural Constraints
- **86-ing propagation SLA**: item unavailability must reach all channels (app, web, kiosk, MICROS) within **60 seconds** via Kafka → Menu Service → cache invalidation
- **Kiosk offline mode**: kiosk must serve menu and accept orders during 5-minute network blip; local SQLite cache; orders sync when connectivity restored
- **Idempotency**: all payment and points-earning operations keyed by `orderId`; duplicate Kafka events or retried API calls must not double-charge or double-award
- **MICROS integration**: MICROS POS is the authoritative receipt and tax engine; Order Service always confirms with MICROS before marking order `COMPLETE`
- **Otter webhook ingestion**: Otter sends delivery orders as webhooks; Delivery Gateway must acknowledge within **3 seconds** or Otter retries; idempotency key = Otter order ID

## Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Availability** | 99.95% for Order, Payment, Menu services during peak trading hours (11 AM – 2 PM, 5 PM – 8 PM local) |
| **Latency** | p95 order placement < 800 ms end-to-end; menu load < 300 ms (CDN-cached) |
| **Throughput** | 2.4 M transactions/day peak; burst capacity for limited-time promotions (3× normal) |
| **Kiosk offline** | Accept orders for up to 5 minutes without network; sync on reconnect |
| **86-ing propagation** | ≤ 60 seconds from manager action to all channel updates |
| **Data retention** | Transaction records: 7 years; loyalty point history: 3 years after account closure |
| **Test coverage** | Unit ≥ 80%; integration ≥ 60%; Playwright E2E on critical ordering paths |
