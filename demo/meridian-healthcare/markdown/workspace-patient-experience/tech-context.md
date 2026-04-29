# Meridian Health Group — Patient Experience Team: Technology Context

## Services Owned by This Team

| Service | Responsibility | Technology |
|---|---|---|
| **Appointment Service** | Slot availability, booking, cancellation, rescheduling, waitlist, Epic sync | Lambda + PostgreSQL 15 + FHIR Adapter |
| **Prescription Service** | Repeat prescription request submission, status polling from Epic, reminder scheduling | Lambda + DynamoDB |
| **Messaging Service** | Patient-to-clinician async messaging, attachment handling, urgent escalation flag | Lambda + PostgreSQL 15 + S3 |
| **Telehealth Service** | Doxy.me session lifecycle, waiting room state, recording consent | Lambda + DynamoDB |
| **Payment Service** | Stripe co-payment initiation, receipt, booking-payment atomicity, refund on Epic booking failure | Lambda + Stripe API |

## Frontends Owned by This Team

| Client | Technology | Notes |
|---|---|---|
| **Patient Web Portal** | React 18 (PWA, Workbox) | Offline read-only cache for upcoming appointments and latest labs; WCAG 2.1 AA; axe-core in CI |
| **Patient Mobile App** | Capacitor shell wrapping the PWA | iOS + Android native wrapper; push notifications via FCM/APNs; no separate native codebase |

---

## Key Technical Constraints

### Appointment Booking + Co-Payment Atomicity
- Booking workflow is a two-phase transaction: (1) create Stripe PaymentIntent and collect payment, (2) write `Appointment` to Epic via FHIR Adapter
- If the FHIR write-back to Epic fails after payment is collected, the Appointment Service triggers a Stripe refund automatically (refund within 5 seconds of FHIR failure)
- If Stripe payment fails, the FHIR write is never attempted; booking is not confirmed
- Appointment slot is held with a **5-minute reservation lock** (Redis TTL) during payment collection to prevent double-booking

### Lab Result Display
- FHIR Adapter polls Epic every 15 minutes for new `DiagnosticReport` and `Observation` resources
- Lab results are only surfaced to the patient **after Epic sets verification status** (`DiagnosticReport.status = final`)
- Results cached in Redis (15-minute TTL); cache invalidated on new poll results
- Patient receives a push + email notification when new lab results are available (Notification Service)

### Proxy Access Enforcement
- Proxy grants stored in Cognito (custom attribute: `proxyFor: [patientId1, patientId2]`)
- Admin approval flow: proxy request stored in a DynamoDB queue; admin reviews via Care Coordination portal; approval triggers Cognito attribute update
- All API calls made with a proxy JWT include both `proxyUserId` and `patientId`; services validate that a valid proxy grant exists before returning PHI

### Virus Scanning on Attachments
- Message attachments uploaded via pre-signed S3 URL (max 5 MB photos, 10 MB PDFs)
- S3 `ObjectCreated` event triggers a ClamAV Lambda; if a virus is detected, the object is deleted and the upload is rejected with a 400 response to the patient; Messaging Service notifies the patient

### Telehealth (Doxy.me)
- Doxy.me session token generated server-side by Telehealth Service; valid for 60 minutes from appointment start time
- Doxy.me iframe embedded in the patient portal at appointment time; postMessage API used for session lifecycle events (joined, ended, recording-consent)
- Recording: opt-in consent captured before session starts; recordings stored in S3 with 90-day retention

---

## External Integrations (this team)

| Integration | Protocol | Direction | Notes |
|---|---|---|---|
| **FHIR Adapter → Epic** | FHIR R4 REST (OAuth 2.0 SMART on FHIR) | Appointment/Prescription Service → FHIR Adapter → Epic | Booking, cancellation, prescription write-back; lab and radiology polling |
| **Doxy.me** | iframe + postMessage | Telehealth Service → Doxy.me | Session token exchange; lifecycle events |
| **Stripe** | Stripe Payment Intent API | Payment Service ↔ Stripe | Co-payment collection; refund on FHIR failure; webhook: `payment_intent.succeeded`, `payment_intent.payment_failed` |
| **Twilio** | REST API | Notification Service → Twilio | Appointment reminders (24h + 2h); urgent message alerts |
| **SendGrid** | REST API | Notification Service → SendGrid | Booking confirmations, lab available notifications, password reset |
| **AWS Cognito** | SDK | Auth Service ↔ Cognito | Patient registration, MFA, proxy attribute management |
| **ClamAV** | Lambda (event-driven) | S3 ObjectCreated → ClamAV Lambda | Virus scan all message attachments before delivery |

---

## Non-Functional Requirements (this team)

| Category | Requirement |
|---|---|
| **Appointment booking** | Slot reservation lock held for 5 minutes during payment; FHIR write-back within 3 seconds of payment confirmation |
| **Lab result latency** | Results polled every 15 minutes; patient notified within 5 minutes of Epic verification |
| **Attachment virus scan** | ClamAV scan completes within 10 seconds; infected files deleted and patient notified before delivery |
| **Co-payment refund** | Stripe refund initiated within 5 seconds of FHIR write-back failure |
| **Telehealth session** | Doxy.me session token generated within 2 seconds of patient joining the waiting room |
| **Offline PWA** | Upcoming appointments (next 7 days) and latest lab results cached for offline read access |
| **Accessibility** | WCAG 2.1 AA; axe-core integrated in GitHub Actions CI; screen reader tested on iOS VoiceOver and Android TalkBack |
| **HIPAA audit** | Every PHI access event emitted to Audit Service within 1 second (EventBridge async) |
