# Pinnacle Properties Group — Agent Experience Team: Technology Context

## Services Owned by This Team

| Service | Responsibility | Technology |
|---|---|---|
| **Agent Service** | Agent profile, lifecycle status, E&O and license record management, onboarding checklist | Node.js 20 + PostgreSQL 15 |
| **Recruiting Service** | Pipeline management, prospect record, stage transitions, source attribution, Recruiting Admin queue | Node.js 20 + PostgreSQL 15 |
| **Onboarding Service** | Checklist step tracking, step completion events, block-removal on 100% completion | Node.js 20 + PostgreSQL 15 |
| **Cap Tracking Service** | Year-to-date cap accumulator, anniversary date management, projection engine | Node.js 20 + PostgreSQL 15 |
| **E&O Monitor Lambda** | Nightly cron: check all E&O and license expiry dates; emit alerts and block events | Lambda (scheduled EventBridge rule) |

## Frontends Owned by This Team

| Client | Technology | Notes |
|---|---|---|
| **Agent Portal** | React 18 SPA (TypeScript) | Cognito JWT auth; role-gated by agent status; responsive (desktop + tablet); Tailwind CSS |
| **Branch Manager Dashboard** | React 18 SPA (same codebase, role-gated views) | Multi-agent production view; cap progress report; E&O alert queue |
| **Recruiting Admin Console** | React 18 SPA (internal, same codebase) | Pipeline kanban, application review, license verification queue |

---

## Key Technical Constraints

### Stripe Connect for Agent Bank Accounts
- Each agent connects their bank account via **Stripe Connect Express** (OAuth flow from the agent portal)
- Stripe stores bank account details; Pinnacle never handles raw bank account numbers
- The Onboarding Service records the Stripe `accountId` against the agent profile on successful connection
- Stripe Connect payouts are initiated by the Disbursement Service (Transaction Management team), not this team — the Agent Experience team only manages the Connect onboarding flow

### License Verification
- **TREC (Texas)**: TREC public license search API — Agent Service calls TREC API to verify license number + expiry date at onboarding; re-verified nightly by E&O Monitor Lambda
- **FREC (Florida)**: FREC does not provide a real-time API; verification is manual (Recruiting Admin uploads a screenshot of the FREC portal confirmation); the system stores the upload date as the verification date
- License data is stored in the Agent Service database; the nightly E&O Monitor Lambda compares stored expiry dates against today's date

### E&O Monitor Lambda
- Runs at **6 AM CT daily** via EventBridge Scheduler
- Checks all agents with `status = ACTIVE` or `status = ONBOARDING` for E&O and license expiry dates
- Emits events: `agent.eo_warning` (at 30/14/7 days) and `agent.eo_expired` (on expiry date)
- `agent.eo_expired` event consumed by Agent Service (sets `transactionBlocked = true`) and Notification Service (sends email + SMS to agent and Branch Manager)

### Cap Tracking
- Cap accumulator is updated by the Commission Engine (Transaction Management team) via an EventBridge event (`commission.brokerage_side.paid`) after each transaction closes
- Cap Tracking Service listens to this event and updates the running YTD accumulator
- Anniversary date is stored per agent; anniversary reset is triggered by the Cap Tracking Service on the anniversary date
- Projection engine: trailing 90-day average brokerage-side commission per month × remaining months to anniversary = projected additional contributions; estimated cap date calculated if trajectory continues

### Calendly Integration (Showing Schedule)
- Phase 1: Calendly iFrame embed on the Listing Specialist's listing page in the agent portal
- Calendly event data is not synced to DealDesk (read-only embed only)
- Phase 2: Calendly API integration to sync showing times into the DealDesk transaction record

---

## External Integrations (this team)

| Integration | Protocol | Direction | Notes |
|---|---|---|---|
| **TREC API** | REST | Agent Service → TREC | License verification at onboarding + nightly re-verification |
| **Stripe Connect** | OAuth 2.0 + REST | Agent Portal → Stripe | Bank account connection at onboarding; Stripe stores account details |
| **DocuSign** | REST + webhook | Onboarding Service ↔ DocuSign | Independent Contractor Agreement e-sign; webhook confirms completion |
| **Follow Up Boss** | REST (read-only) | Recruiting Service ← FUB | Legacy CRM sync; Phase 1 only; deprecated Phase 2 |
| **Calendly** | iFrame (Phase 1) / REST API (Phase 2) | Agent Portal → Calendly | Showing schedule; Phase 1 embed only |
| **MLS Sync Service** | EventBridge (consumer) | MLS Sync → Agent Portal (listing status) | Listing status updates for Listing Specialists |
| **SendGrid / Twilio** | REST (via Notification Service) | Agent Service → Notification Service | E&O alerts, onboarding reminders, cap milestone notifications |

---

## Non-Functional Requirements (this team)

| Category | Requirement |
|---|---|
| **E&O block accuracy** | Block applied at 6 AM CT on expiry date; not retroactive; not delayed beyond 6 AM CT |
| **Cap accumulator update** | Updated within 5 minutes of `commission.brokerage_side.paid` EventBridge event |
| **TREC verification** | TREC API call responds within 5 seconds; timeout returns cached result with stale indicator |
| **Onboarding checklist** | Transaction creation blocked until all 6 steps have `status = complete` in Onboarding Service (enforced at Transaction Service, not just UI) |
| **Stripe Connect flow** | OAuth redirect + bank account confirmation completes within 3 minutes; on timeout, agent can retry without starting over |
| **Dashboard performance** | Agent dashboard loads within 2 seconds; branch manager multi-agent dashboard within 4 seconds (pagination for >50 agents) |
