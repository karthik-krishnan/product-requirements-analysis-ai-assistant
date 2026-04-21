# Heritage Bank Digital — Technical Context

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                     │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Mobile App  │  │  Online      │  │  Branch      │  │  SMB Business  │  │
│  │ (React Native│  │  Banking     │  │  Teller App  │  │  Portal        │  │
│  │  iOS/Android)│  │  (React SPA) │  │  (React SPA, │  │  (React SPA)   │  │
│  └──────┬───────┘  └──────┬───────┘  │  internal)   │  └───────┬────────┘  │
│         │                 │          └──────┬───────┘          │           │
└─────────┼─────────────────┼─────────────────┼──────────────────┼───────────┘
          │  HTTPS          │                 │  mTLS (internal) │
          │  + biometric    │                 │                  │
┌─────────▼─────────────────▼─────────────────▼──────────────────▼───────────┐
│             API GATEWAY — Kong Gateway (on-prem + AWS API GW for cloud)     │
│    Okta JWT validation  •  Rate limiting  •  mTLS enforcement  •  Audit log │
└──────┬────────────┬──────────────┬──────────────────┬────────────────────────┘
       │            │              │                  │
┌──────▼──────┐ ┌───▼──────────┐ ┌▼─────────────┐ ┌──▼─────────────────────┐
│  Customer   │ │  Account     │ │  Payment     │ │  Notification          │
│  Service    │ │  Service     │ │  Service     │ │  Service               │
│             │ │              │ │              │ │                        │
│  Okta +     │ │  Spring Boot │ │  Spring Boot │ │  AWS SES + Twilio +    │
│  Spring Boot│ │  → BIH → AS/4│ │  → BIH → AS/4│ │  SNS Push              │
└──────┬──────┘ └───┬──────────┘ └┬─────────────┘ └────────────────────────┘
       │            │             │
┌──────▼────────────▼─────────────▼──────────────────────────────────────────┐
│               BANKING INTEGRATION HUB (BIH)                                │
│         The strangler-fig adapter layer — owns all AS/400 communication    │
│                                                                             │
│  FiServ Open Solutions API (REST)    IBM MQ (async)    SFTP batch jobs      │
│  ← ~60% of operations              ← ACH files        ← statements/reports │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────────────────┐
│               LEGACY CORE — IBM AS/400 (IBM i 7.4 / Power9)                │
│                   FiServ Precision Core Banking System                      │
│                                                                             │
│   Accounts (DDA/SAV/CD/HELOC)    Transaction Ledger    Interest Engine      │
│   ACH Module (FedACH)            GL / Regulatory       Loan Module          │
│   Nightly batch (00:00–04:00 CT) EOD cutoff (18:00 CT)                     │
└──────────────────────────────┬─────────────────────────────────────────────┘
                               │  IBM MQ  +  Direct integration
       ┌───────────────────────┼──────────────────────────────┐
       │                       │                              │
┌──────▼──────┐    ┌───────────▼───────┐          ┌──────────▼──────────────┐
│ Card Mgmt   │    │  Fraud &          │          │  External Networks       │
│ Service     │    │  Compliance Svc   │          │                         │
│             │    │                   │          │  FIS Worldpay (cards)   │
│FIS Worldpay │    │  NICE Actimize +  │          │  EWS / Zelle (P2P)      │
│ token store │    │  Kafka consumer   │          │  TCH RTP (real-time pay)│
│ Spring Boot │    │  + Spring Boot    │          │  FedACH (ACH)           │
└─────────────┘    └───────────────────┘          │  Fedwire (wire)         │
                                                  │  SWIFT (international)  │
                                                  │  Fiserv CheckFree (bill)│
                                                  └─────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────────────────┐
│                    DOMAIN EVENT BUS — Apache Kafka (on-prem Confluent)      │
│   transaction.posted  •  account.opened  •  transfer.initiated              │
│   fraud.alert.raised  •  card.blocked  •  ach.submitted  •  wire.approved   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Services Reference

| Service | Responsibility | Technology |
|---|---|---|
| **Banking Integration Hub (BIH)** | Central adaptor: translates REST/Kafka calls to FiServ API + IBM MQ; owns AS/400 error mapping | Spring Boot 3.2 (Java 21) + IBM MQ Client |
| **Customer Service** | Customer profile, identity verification, KYC status, proxy/joint account relationships | Spring Boot 3.2 + PostgreSQL 15 + Okta |
| **Account Service** | Account summary, transaction history, statement retrieval, balance (real-time available vs book) | Spring Boot 3.2 → BIH → AS/400 |
| **Payment Service** | Internal transfers, ACH initiation, Zelle, RTP, bill pay dispatch, wire initiation | Spring Boot 3.2 → BIH + external networks |
| **Card Management Service** | Debit card controls (lock/unlock, travel notice, limits), FIS Worldpay token management | Spring Boot 3.2 + FIS Worldpay REST |
| **Fraud & Compliance Service** | Actimize alert consumption, SAR/CTR workflow, velocity rule enforcement | Spring Boot 3.2 + Kafka consumer + Actimize REST |
| **Notification Service** | Balance alerts, transaction confirmations, fraud alerts, secure messages | AWS SES (email) + Twilio (SMS) + SNS (push) |
| **Lending Gateway** | Consumer loan application intake, status polling from Blend | Spring Boot 3.2 + Blend API |
| **SMB Portal BFF** | Backend-for-frontend: multi-account aggregation, user role management, ACH payroll file | Spring Boot 3.2 + GraphQL |
| **Audit Service** | Immutable log of all customer-data access and configuration changes (SOX + BSA) | Kafka → Elasticsearch + S3 Glacier |
| **Reporting Service** | Regulatory reports (CTR, SAR), Snowflake feed for BI, branch performance | Snowflake Connector + Spring Batch |

## Tech Stack

### Frontend
- **Mobile**: React Native 0.73 (iOS 15+, Android 11+); Expo managed; biometric auth via device secure enclave
- **Online Banking / SMB Portal**: React 18 SPA; Vite 5 build; TypeScript strict; Material UI (MUI) v5 component library
- **Branch Teller App**: React 18 SPA (internal, Chrome-only); no offline requirement; mTLS cert-based auth
- **State management**: Redux Toolkit (online banking — complex multi-account state); React Query v5 (server cache)
- **Forms**: React Hook Form + Yup; multi-step wizard pattern for transfers and loan application

### Backend (Modern Layer)
- **Runtime**: Java 21 (Spring Boot 3.2) — chosen for FiServ and IBM MQ SDK availability; virtual threads (Project Loom)
- **API style**: REST (external customer-facing); GraphQL (SMB BFF); async Kafka (inter-service events)
- **Auth**: Okta as IdP; OIDC + PKCE for mobile/web; SAML 2.0 for branch SSO (Active Directory federation)
- **Database**: Amazon RDS PostgreSQL 15 (Customer, Account, Payment, Card services); separate schema per service (not shared DB)
- **Cache**: Redis 7 (ElastiCache) — account summary cache (TTL 30 s, invalidated on transaction event), idempotency keys
- **Event streaming**: Apache Kafka (Confluent Platform, on-prem in primary DC; Confluent Cloud for DR)
- **Queue**: IBM MQ 9.3 — reliable AS/400 message delivery; dead-letter queue monitored by BIH operations team

### Legacy Layer (IBM AS/400)
- **Platform**: IBM i 7.4 running on Power9 LPAR; managed by Infrastructure team (not Heritage Digital)
- **Core system**: FiServ Precision — COBOL + RPG programs; no source-level changes by Heritage Digital team
- **Access methods**:
  - FiServ Open Solutions API (REST over HTTPS) — account inquiry, balance, transaction posting (~60% coverage)
  - IBM MQ — ACH file submission, batch job triggers, GL event notifications (async, guaranteed delivery)
  - SFTP batch — nightly statement generation, CTR/SAR report extracts, Snowflake data feed
  - **TN5250 screen scraping**: legacy internal tools only; deprecated; BIH is replacing all screen-scraping integrations by end of programme
- **Batch windows**: nightly (00:00–04:00 CT) and EOD (18:00 CT) are **frozen** — no BIH calls to AS/400 during these windows; services must queue and retry

### Infrastructure & DevOps
- **Hybrid cloud**: Core AS/400 and Confluent Kafka on-prem (primary DC: Columbus, OH); modern microservices on AWS (us-east-1)
- **Connectivity**: AWS Direct Connect (10 Gbps) between DC and AWS VPC; BIH deployed on-prem and in AWS (active-active)
- **IaC**: Terraform (AWS resources); IBM i changes via formal CAB process only (no IaC)
- **CI/CD**: GitLab CI — compile → unit test → integration test (Docker Compose with AS/400 stub) → staging → prod (manual gate + CAB ticket)
- **Change management**: SOX ITGC requires CAB approval for all production changes; emergency changes need CISO + CTO sign-off
- **Observability**: Dynatrace APM (full-stack Java tracing); IBM i performance logs via SMF records; PagerDuty on-call
- **Secrets**: HashiCorp Vault (on-prem) — database passwords, IBM MQ credentials, FiServ API keys; AWS Secrets Manager for cloud-only services

### Key Architectural Constraints

- **AS/400 batch window**: BIH must **not call FiServ API or IBM MQ** between 00:00–04:00 CT and 18:00–18:30 CT. Payment Service queues operations and replays after window. Clients show "system maintenance" message.
- **Book vs available balance**: AS/400 provides two balances — `bookBalance` (ledger, updated at EOD batch) and `availableBalance` (real-time, via FiServ API). Account Service always shows `availableBalance` to customers; never shows `bookBalance` alone.
- **Idempotency is critical**: duplicate IBM MQ messages and Kafka retries are expected. Every Payment Service operation has an idempotency key (`clientTransactionId`) checked against Redis before forwarding to BIH.
- **No direct AS/400 write from services**: only BIH may write to AS/400. All other services call BIH. This is a hard architectural rule enforced by network ACL.
- **SOX segregation**: developers have no access to production AWS environments or AS/400. All prod changes go through the automated pipeline + CAB approval.
- **Strangler-fig progress**: BIH owns the migration backlog. Current state: Account inquiry, balance, transfers (done). ACH origination (in progress). Wire initiation, CD management (roadmap). IVR and branch teller green-screen (deferred — post Phase 2).

## Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Availability** | 99.9% for customer-facing channels (planned maintenance excluded); AS/400 batch windows are known downtime |
| **Latency** | p95 balance check < 500 ms; transfer initiation < 1 s; AS/400 calls via BIH < 2 s (FiServ API SLA) |
| **Throughput** | 1.2 M retail customers; peak 50,000 concurrent sessions (mobile payday surge) |
| **Data residency** | All customer data must remain within US (regulatory + contractual constraint) |
| **Audit retention** | BSA records: 5 years; SOX ITGC evidence: 7 years; transaction logs: 7 years |
| **RTO / RPO** | RTO 4 h (AS/400 failover to DR site); RPO 1 h (MQ journal + PostgreSQL continuous backup) |
| **Batch window** | BIH queues all AS/400-bound requests during 00:00–04:00 CT nightly batch and 18:00 CT EOD |
| **Change freeze** | No production deployments on Fridays after 15:00 CT or on public holidays (SOX control) |
