# Requirements Prompt — CrunchBite Kitchen & Operations Team

## How to use this file

1. In ProductPilot, go to **Settings → Enterprise Context** and paste the contents of `enterprise/enterprise-domain-context.md` into the Domain Context field. Paste `enterprise/enterprise-tech-context.md` into the Tech Context field.
2. Select or create the **Kitchen & Operations** workspace. Paste `workspace-kitchen-operations/domain-context.md` into its Domain Context field and `workspace-kitchen-operations/tech-context.md` into its Tech Context field.
3. Copy the requirements text below and paste it into the **Requirements Intake** screen.

---

## Requirements Text (paste this)

```
Modernize CrunchBite's in-store kitchen and operations platform covering the Kitchen Display System (KDS),
speed-of-service monitoring, store manager tools, and franchise performance dashboards.

Scope for this initiative:

1. KITCHEN DISPLAY SYSTEM (KDS)
   - Orders routed to Epson KDS hardware, grouped by station: grill, fry, sandwich, beverage
   - Ticket must appear on the correct station screen(s) within 1 second of the order being placed
   - Modifier details and order type (dine-in / pickup / delivery / drive-through) visible on every ticket
   - Bump: kitchen staff taps an item when ready; station ticket clears when all items at that station are bumped
   - Recall: last 20 bumped tickets accessible for re-display (e.g., for lost or incorrect orders)
   - Expediter screen: consolidates all station outputs; shows order as assembled when all stations have bumped; expediter bumps to mark order ready for handoff
   - Make time targets: standard orders 3 minutes, catering items 5 minutes; visual alert when target is exceeded
   - Handheld bump screens: Kotlin Android tablets for kitchen staff who move between stations; real-time via MQTT

2. DRIVE-THROUGH OPERATIONS
   - Speed-of-Service (SOS) timer shown to drive-through attendant from order-placed to order-ready
   - Transaction time target: 3 minutes 30 seconds order-to-window
   - Dual-lane drive-through stores (240 of 680 corporate stores) display two separate queue views on the expediter screen
   - Order Confirmation Unit (OCU): real-time cart display for the customer at the order point
   - AI suggestive selling: upsell prompt on OCU based on order content and daypart (rules-engine, Phase 1)

3. STORE MANAGER TOOLS
   - Real-time SOS dashboard: per-order timer, rolling store average, breach alerts (orders > 30 seconds over target)
   - 86-ing: mark any menu item unavailable for this store; propagates to all ordering channels within 60 seconds; view currently 86'd items; restore individually
   - Void/refund controls: voids up to $75 processed by store manager; above $75 requires district manager PIN entry at POS
   - End-of-day report: gross sales, order count, voids, average SOS, items 86'd during the shift
   - Store Config management: store hours, delivery radius, per-store feature flag overrides

4. FRANCHISE & MULTI-STORE DASHBOARDS
   - Franchise owner: multi-store roll-up showing gross transaction value, average ticket, SOS average, labour vs target, food cost %, top items — refreshed every 15 minutes
   - Franchise Business Consultant (FBC): territory-level aggregation across 15–30 stores; compliance scoring (% of stores meeting SOS target); franchisee alert queue
   - KPIs: GTV, average ticket size, drive-through throughput, NPS score per store

5. NPS & GUEST FEEDBACK
   - Medallia NPS survey triggered automatically after every completed order
   - Survey delivered via email or SMS per member preferences; link-based for guest orders
   - Store managers see their store's NPS score and verbatim comments in the Manager Dashboard

The platform must integrate with:
- Oracle MICROS POS (order sync, receipt, tax, drawer management)
- Epson KDS hardware (WebSocket-based ticket delivery)
- AWS IoT Core / MQTT (Kotlin Android handheld bump screens)
- Snowflake + Kafka Connector (franchise dashboards and SOS analytics)
- Tableau (embedded franchise dashboard charts)
- Medallia (NPS trigger post-transaction)
- Apache Kafka MSK (shared platform event bus — order.placed, order.ready, item.86d events)

Phase 1: KDS (station screens + expediter), Store Manager tools (86-ing, SOS, voids), MICROS integration.
Phase 2: Handheld bump screens (Kotlin + MQTT), Franchise dashboards (Snowflake + Tableau), OCU suggestive selling, Medallia NPS.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| KDS hardware | Epson KDS displays already installed at all corporate stores; new software connects via WebSocket from Kitchen Service |
| Handheld bump screens | Android tablets running Kotlin app; MQTT via AWS IoT Core; device certificates for auth; Phase 2 |
| SOS measurement | SOS start = order.placed Kafka event timestamp; SOS end = expediter bump timestamp; no client-side clocks |
| 86-ing scope | Store managers can 86 items at their own store only; corporate can 86 across all stores for supply chain issues |
| Void authority | Up to $75: store manager alone; above $75: district manager PIN required at MICROS terminal |
| Franchise dashboard data source | Snowflake (populated via Kafka Connector); Tableau embedded in franchise portal; 15-minute refresh cadence |
| Dual-lane drive-through | 240 of 680 corporate stores; each lane shown as separate queue on expediter screen; routing by lane number in order record |
| OCU suggestive selling | Rules-engine (not ML) in Phase 1 based on order content + daypart; ML personalisation (LPR-linked) in Phase 2 |
| Phasing | Phase 1 (4 months): KDS station displays, expediter screen, 86-ing, SOS dashboard, void controls; Phase 2 (month 6): handheld bump screens, franchise dashboards, OCU, Medallia |
