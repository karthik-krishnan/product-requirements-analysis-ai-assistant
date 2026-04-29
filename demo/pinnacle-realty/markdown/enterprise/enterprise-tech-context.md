# Pinnacle Properties Group — Enterprise Technology Context

## Platform Overview

DealDesk is a greenfield platform replacing four legacy systems. It is built as a modern cloud-native application on AWS, with a React SPA frontend and Node.js microservices backend. The architecture prioritizes correctness of commission calculations (all calculations are idempotent and versioned), compliance document integrity, and MLS data freshness.

---

## Shared Infrastructure

### Cloud & Deployment
- **Cloud provider**: AWS (us-east-1 primary; Texas and Florida agents share a single region)
- **Runtime**: Node.js 20 LTS on Amazon ECS Fargate (containerized services); not Lambda (services require persistent state and long-running jobs for MLS polling and commission batch runs)
- **IaC**: AWS CDK v2 TypeScript — all infrastructure version-controlled
- **CI/CD**: GitHub Actions — lint → unit test → integration test → staging → manual production approval
- **Database**: Amazon RDS PostgreSQL 15 (Multi-AZ) for all transactional data (agent profiles, transactions, commission records, cap tracking)
- **Document storage**: Amazon S3 (SSE-KMS); S3 Lifecycle Policy enforces 7-year retention (Standard 3 years → Glacier 4 years)
- **Secrets**: AWS Secrets Manager; DocuSign, Stripe, MLS API keys rotated quarterly

### API Gateway & Security
- **API Gateway**: AWS API Gateway (REST API) + CloudFront CDN for the React frontend
- **Auth**: AWS Cognito User Pools; role claims in JWT (agent / TC / branch-manager / finance / recruiting-admin / broker / admin)
- **MFA**: optional for agents; mandatory for Finance, Branch Manager, Broker of Record, and Admin roles
- **mTLS**: enforced on DocuSign webhook callbacks and Stripe webhook endpoints

### Event Bus
- **Amazon EventBridge** for domain events; **Amazon SQS** for reliable point-to-point communication (MLS sync jobs, commission batch triggers, DocuSign webhook processing)
- Key events:

| Event | Producer | Key Consumers |
|---|---|---|
| `transaction.closed` | Transaction Service | Commission Engine, CDA Service |
| `cda.countersigned` | CDA Service (DocuSign webhook) | Disbursement Service |
| `disbursement.completed` | Disbursement Service | QBO Sync Service, Notification Service |
| `mls.listing.status.changed` | MLS Sync Service | Transaction Service (milestone update) |
| `agent.eo_expired` | E&O Monitor Lambda | Agent Service (block flag), Notification Service |
| `cap.milestone.reached` | Commission Engine | Notification Service |

---

## Shared Services (Platform Team)

| Service | Responsibility |
|---|---|
| **MLS Sync Service** | Polls NTREIS, HAR, and Stellar MLS every 15 minutes; emits `mls.listing.status.changed` events |
| **Notification Service** | Email (SendGrid) + SMS (Twilio) + in-app notifications; agent preference respected |
| **QBO Sync Service** | Syncs completed disbursements to QuickBooks Online as journal entries |
| **E&O Monitor Lambda** | Nightly check of all agent E&O expiry dates; escalating alerts at 30/14/7/0 days |
| **Document Store** | S3 SSE-KMS storage; pre-signed URL generation (15-minute TTL) for secure document access |

---

## Engineering Standards

- **Language**: TypeScript (Node.js 20) for all services; React 18 (TypeScript strict mode) for all frontends
- **Commission calculations are idempotent**: same inputs always produce the same output; every calculation versioned with a hash of inputs; no mutable calculation state
- **DocuSign webhooks**: all envelope status changes received via DocuSign Connect webhook; webhook endpoint protected by HMAC signature verification before processing
- **Stripe payouts**: all payouts via Stripe Connect; idempotency key = disbursement record ID; duplicate webhooks produce no additional payout
- **MLS sync failures**: if 3 consecutive sync jobs fail for a listing, alert the assigned TC and branch manager; manual re-sync available from admin console
- **Testing**: unit ≥ 80%; integration ≥ 60%; Commission Engine has 100% test coverage (critical financial logic)
- **Deployments**: no production deployments on Fridays after 3 PM; rollback plan required for all production changes
