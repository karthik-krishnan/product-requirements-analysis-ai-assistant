# Meridian Health Group — Care Coordination Team: Technology Context

## Services Owned by This Team

| Service | Responsibility | Technology |
|---|---|---|
| **Referral Service** | Referral creation, urgency routing, admin assignment queue, FHIR ServiceRequest write-back | Lambda + PostgreSQL 15 + FHIR Adapter |
| **Care Plan Service** | Care plan CRUD, task assignment, review date alerts, FHIR CarePlan sync | Lambda + PostgreSQL 15 + FHIR Adapter |
| **Check-In Service** | Walk-in queue management, arrival status, no-show prompting, FHIR Appointment write-back | Lambda + DynamoDB (real-time queue state) |
| **Waitlist Service** | Waitlist registration, slot-offer workflow, 30-minute response window | Lambda + DynamoDB + Notification Service |
| **Admin Service** | Proxy access approval workflow, Cognito grant management, proxy revocation | Lambda + DynamoDB + Cognito |

## Frontends Owned by This Team

| Client | Technology | Notes |
|---|---|---|
| **Clinician Portal** | React 18 SPA (TypeScript) + GraphQL subscriptions | Role-gated by Okta/Cognito claims (GP / Specialist / Nurse / Admin); real-time inbox badge via GraphQL subscription |
| **Front Desk Display** | React 18 SPA (kiosk mode, full-screen) | Walk-in queue and appointment schedule; auto-refreshes every 30 seconds; displayed on reception screen |
| **Waiting Room Display** | React 18 SPA (read-only, public) | Queue position and estimated wait time; no PHI displayed (only queue number and estimated wait) |

---

## Key Technical Constraints

### Real-Time Inbox & GraphQL Subscriptions
- The clinician inbox uses **GraphQL subscriptions** (AWS AppSync WebSocket) for real-time badge updates
- When a new message, prescription request, or referral arrives, an EventBridge event triggers an AppSync mutation, which pushes an update to all subscribed clinicians
- Urgency escalation (unread urgent message after 30 minutes) is a scheduled Lambda that checks DynamoDB and triggers a Twilio SMS to the specialist's supervisor

### FHIR Adapter — Care Coordination Context
- All FHIR reads from the Clinician Portal use **SMART on FHIR context scoping** — the FHIR Adapter enforces that the requesting clinician has a valid care relationship with the patient before returning PHI
- Care relationship validation: the clinician's `practitionerId` (from JWT claim) is checked against the `Appointment.participant` or `CarePlan.author` list for the patient in Epic
- Write-back latency target: FHIR writes (referral creation, appointment status, care plan update) must confirm within **3 seconds** of clinician action

### Walk-In Queue (Real-Time State)
- Walk-in queue state stored in DynamoDB (not PostgreSQL) for low-latency real-time reads
- Front Desk Display refreshes every 30 seconds (polling); Walk-in patients added to the queue immediately on check-in
- Queue position estimation: average consultation time (rolling 60-minute average per clinician) used to calculate estimated wait; displayed on the Waiting Room screen
- No PHI on the Waiting Room Display — only queue number and estimated wait time (patient given their queue number on arrival)

### Proxy Access Approval
- Proxy request documents (scanned consent forms) uploaded to S3 via pre-signed URL; ClamAV virus-scanned before display to admin
- Admin approval action: calls the Admin Service → Auth Service → Cognito `adminUpdateUserAttributes` to set `custom:proxyFor` attribute
- Approval is synchronous from admin's perspective; Cognito update confirmed before success response returned

---

## External Integrations (this team)

| Integration | Protocol | Direction | Notes |
|---|---|---|---|
| **FHIR Adapter → Epic** | FHIR R4 REST (SMART on FHIR) | Referral/CarePlan/CheckIn Service → FHIR Adapter → Epic | Referral ServiceRequest, CarePlan, Appointment status write-backs; patient record reads |
| **AWS AppSync** | WebSocket (GraphQL subscription) | Clinician Portal ← AppSync | Real-time inbox badge; new message/referral/prescription notifications |
| **AWS Cognito** | SDK | Admin Service ↔ Cognito | Proxy access grant management; role claim updates |
| **Twilio** | REST API | Notification Service → Twilio | Urgent referral escalation SMS; waitlist slot offer SMS |
| **SendGrid** | REST API | Notification Service → SendGrid | Referral confirmation email to patient; appointment confirmed email |
| **ClamAV Lambda** | S3 event trigger | S3 → ClamAV Lambda | Virus scan proxy consent form before admin review |
| **EventBridge** | Event bus | Care Coordination Services → EventBridge | `referral.created`, `appointment.arrived`, `careplan.task.completed` events |

---

## Non-Functional Requirements (this team)

| Category | Requirement |
|---|---|
| **FHIR write-back** | Referral, care plan, and appointment status writes confirm within 3 seconds |
| **Inbox real-time update** | New inbox item pushed to clinician within 5 seconds of EventBridge event via AppSync subscription |
| **Urgent escalation** | Unread urgent message triggers supervisor SMS within 30 minutes of delivery |
| **Walk-in queue refresh** | Front Desk Display refreshes every 30 seconds; queue state accurate to within 30 seconds |
| **SMART on FHIR enforcement** | FHIR Adapter returns 403 for any request where the clinician does not have a verified care relationship with the patient |
| **Proxy approval latency** | Cognito attribute update confirmed synchronously; admin sees "approved" confirmation within 3 seconds |
| **HIPAA audit** | All PHI access events in the clinician portal emitted to Audit Service within 1 second (EventBridge async) |
