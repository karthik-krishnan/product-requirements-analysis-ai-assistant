# CrunchBite — Kitchen & Operations Team: Technology Context

## Services Owned by This Team

| Service | Responsibility | Technology |
|---|---|---|
| **Kitchen Service** | KDS ticket delivery, station routing, bump/recall, SOS timer calculation | Lambda + WebSocket API Gateway + DynamoDB |
| **Store Config Service** | Store hours, delivery radius, price overrides, feature flags per store | Lambda + DynamoDB |
| **Analytics Service** | Real-time SOS metrics, item-level sales, franchise roll-up, Snowflake feed | Kafka → Snowflake Kafka Connector + Lambda |
| **Catering Service** | Group order management, coordinator assignment, lead-time validation | Lambda + Aurora PostgreSQL 15 |

## Frontends Owned by This Team

| Client | Technology | Notes |
|---|---|---|
| **KDS App (station display)** | Electron 30 + React 18 | Windows 10 IoT hardware; WebSocket connection to Kitchen Service; offline-tolerant with local queue |
| **KDS Bump Screen (handheld)** | Kotlin (Android) | Tablet-based handheld bump screens for kitchen staff; MQTT for sub-second real-time updates |
| **Manager Dashboard** | React 18 SPA | Tablet/desktop; 86-ing controls, SOS dashboard, void/refund, end-of-day report; Apollo Client + GraphQL BFF |
| **Franchise Dashboard** | React 18 SPA + Apollo Client | Multi-store roll-up; data sourced from Snowflake via GraphQL BFF; Tableau embeds for trend charts |

---

## Real-Time Architecture (Kitchen)

### WebSocket + MQTT
- **Kitchen Service** maintains WebSocket connections to the KDS desktop app (Electron) via AWS WebSocket API Gateway
- **MQTT broker** (AWS IoT Core) handles real-time communication to Kotlin Android handheld bump screens
  - MQTT topic structure: `store/{storeId}/station/{stationName}/ticket`
  - QoS level 1 (at-least-once delivery) for ticket events; idempotent by `ticketId`
- Station routing: when an order is placed, Kitchen Service determines which stations are involved based on item-to-station mapping and publishes to the relevant MQTT topics and WebSocket channels simultaneously

### SOS Timer
- SOS start time = timestamp of `order.placed` Kafka event consumed by Kitchen Service
- SOS end time = timestamp when all items on the expediter bump screen are bumped for that order
- Real-time SOS per order is stored in DynamoDB (TTL 24 hours)
- Aggregated SOS metrics (store average, rolling 15-min average) published to Snowflake via Kafka Connector every 60 seconds

---

## Key Technical Constraints

### Kitchen Service
- Must deliver a KDS ticket to the relevant station screen(s) within **1 second** of receiving the `order.placed` event from Kafka
- Offline resilience: if WebSocket connection drops, the KDS Electron app stores incoming tickets in a local queue and replays them when the connection is restored; no tickets should be lost
- Bump operations are idempotent: bumping an already-bumped item is a no-op (prevents duplicate bumps from network retries)

### Handheld Bump Screens (Kotlin + MQTT)
- Android 10+ tablets with AWS IoT Core device certificates for MQTT authentication
- Device certificates rotated quarterly via AWS IoT Device Management
- Kotlin app uses MQTT QoS 1; reconnect strategy: exponential backoff up to 30 seconds

### Analytics Service
- Kafka consumer group reads from `order.placed`, `order.ready`, `item.86d`, and `shift.opened` topics
- Data is transformed and loaded into Snowflake via the Kafka Snowflake Connector
- Snowflake tables power Tableau dashboards; refresh cadence is near-real-time for SOS and 15-minute batches for sales aggregates
- Franchise dashboards accessed via a GraphQL BFF that queries Snowflake (read-only, row-level security by store ID)

---

## External Integrations (this team)

| Integration | Protocol | Direction | Notes |
|---|---|---|---|
| **Oracle MICROS POS** | MICROS REST API + TCP socket | Kitchen Service → MICROS | Order sync, receipt printing, drawer management |
| **Epson KDS hardware** | WebSocket (KDS app) | Kitchen Service → Epson display | Station ticket delivery |
| **AWS IoT Core (MQTT)** | MQTT | Kitchen Service → Android tablets | Handheld bump screen updates |
| **Infor CloudSuite F&B** | REST API (batch nightly) | Menu Service ← Infor | Inventory and recipe updates (shared with Digital Ordering) |
| **Medallia** | REST API (post-transaction trigger) | Analytics Service → Medallia | NPS survey trigger after every completed order |
| **Snowflake** | Kafka Connector | Analytics Service → Snowflake | SOS metrics, sales data, franchise roll-up |
| **Tableau** | Snowflake JDBC | Tableau ← Snowflake | Franchise and FBC dashboards |

---

## Non-Functional Requirements (this team)

| Category | Requirement |
|---|---|
| **KDS ticket latency** | Ticket must appear on correct station screen(s) within 1 second of order.placed event |
| **SOS accuracy** | SOS timer accuracy ±5 seconds; timestamps from Kafka event (not client-side) |
| **MQTT delivery** | QoS 1 (at-least-once) on all kitchen events; duplicate handling via idempotent ticket ID |
| **Dashboard refresh** | SOS real-time (60-second aggregation); sales dashboard 15-minute batches; franchise roll-up 15 minutes |
| **Offline resilience** | KDS Electron app must queue tickets locally during WebSocket disconnection; no ticket loss |
| **Availability** | Kitchen Service 99.99% during store trading hours; a KDS outage directly stops food production |
