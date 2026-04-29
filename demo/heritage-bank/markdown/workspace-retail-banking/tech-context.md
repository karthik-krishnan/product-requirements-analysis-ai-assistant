# Heritage Bank — Retail Banking Team: Technology Context

## Services Owned by This Team

| Service | Responsibility | Technology |
|---|---|---|
| **Account Service** | Account overview, balances (via BIH), transaction history, statement retrieval | Spring Boot 3.2 → BIH → AS/400 |
| **Transfer Service** | Internal transfers, ACH external, Zelle, RTP, Bill Pay, wire initiation | Spring Boot 3.2 → BIH / EWS / TCH |
| **Card Management Service** | Debit card lock/unlock, travel notice, spending controls, dispute initiation (Reg E) | Spring Boot 3.2 → FIS Worldpay API |
| **Notification Preferences Service** | Customer alert settings; channel preferences (push/SMS/email) | Spring Boot 3.2 + PostgreSQL |
| **Account Opening Service** | Blend integration; identity verification flow; CIP document handling; BIH account creation | Spring Boot 3.2 + Blend API + BIH |

## Frontends Owned by This Team

| Client | Technology | Notes |
|---|---|---|
| **Mobile Banking App** | React Native 0.74 (iOS 16+, Android 10+) | Okta OIDC/PKCE auth; biometric (FaceID/TouchID) as second factor; offline read of cached balance |
| **Online Banking Portal** | React 18 SPA (TypeScript) | Okta session-based auth; hosted on CloudFront + S3 |

---

## Key Technical Constraints

### AS/400 Batch Window Handling
- The Account Service and Transfer Service must **queue all AS/400 write operations** when the batch window is active (midnight–4 AM CT, 6 PM CT EOD)
- During batch windows: reads are allowed (AS/400 serves book balance, which is displayed with a "last updated" timestamp); writes are queued in IBM MQ and processed when the window closes
- Customer-facing UIs must show a "processing" status for queued operations without alarming the customer

### Balance Freshness
- Available balance is fetched from the FiServ Open Solutions API on every page load (not cached for more than 30 seconds)
- ElastiCache Redis caches the available balance with a **30-second TTL** to limit AS/400 API call volume during high-traffic periods
- If the balance API returns a 5xx error, the UI shows the last cached balance with a "balance as of [timestamp]" label

### Idempotency
- All ACH and RTP operations use an idempotency key (UUID v4 generated client-side, persisted in the Transfer Service before submission to BIH)
- Duplicate submissions (e.g., double-tap on the Submit button) return the result of the original operation without re-submitting to AS/400

### Card Management
- FIS Worldpay API lock/unlock is synchronous (response within 3 seconds); Card Management Service reflects the new state in the mobile app within 3 seconds of the API response
- Transaction disputes are stored in the Card Management Service database; provisional credit is applied by the Fraud Analyst team (manual process in Phase 1); automated provisional credit in Phase 2

---

## External Integrations (this team)

| Integration | Protocol | Direction | Notes |
|---|---|---|---|
| **BIH → AS/400** | FiServ Open Solutions REST + IBM MQ | Account/Transfer Service → BIH → AS/400 | All AS/400 operations via BIH only |
| **FIS Worldpay** | REST API | Card Management Service ↔ Worldpay | Lock/unlock, travel notice, spending controls; tokenized card data |
| **EWS / Zelle** | EWS REST API | Transfer Service → EWS | P2P payments; 15-min hold on first recipient |
| **TCH RTP** | TCH RTP REST API | Transfer Service → TCH | Real-time payment submission; no rollback once submitted |
| **Fiserv CheckFree** | REST API | Transfer Service → CheckFree | Bill pay disbursement; Heritage sends payee + amount, CheckFree disburses |
| **Blend** | Blend API | Account Opening Service → Blend | Consumer account opening; KBA; CIP document upload |
| **Okta** | OIDC + SAML | Mobile + Web ← Okta | Auth, MFA enrollment, session management |
| **NICE Actimize** | Kafka (consumer) | Actimize → Notification Service | Fraud alerts consumed from Kafka and pushed to customer |

---

## Non-Functional Requirements (this team)

| Category | Requirement |
|---|---|
| **Balance refresh** | Available balance cached max 30 seconds; always shows real-time label with "as of [time]" |
| **Card lock/unlock** | FIS Worldpay API response within 3 seconds; reflected in app within 3 seconds |
| **Zelle P2P** | First payment to new recipient: 15-minute hold enforced by Transfer Service (not EWS) |
| **ACH cut-offs** | Same-day ACH (SDIE): 2:30 PM CT; next-day ACH: 8 PM CT — Transfer Service enforces these, rejecting late submissions |
| **Session security** | 10-minute inactivity timeout (web); 5-minute (mobile); auto-logout with clear session and Okta token revocation |
| **Availability** | 99.9% for Account Service and Transfer Service; planned maintenance only in batch windows (midnight–4 AM CT) |
| **Accessibility** | WCAG 2.1 AA on mobile and web; VoiceOver / TalkBack tested in CI pipeline |
