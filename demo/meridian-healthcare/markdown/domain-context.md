# HealthConnect — Domain Context

## About the Organisation

HealthConnect is the digital health division of **Meridian Health Group**, a regional hospital network operating
3 acute-care hospitals and 12 outpatient clinics across the South-East. The group serves approximately
420,000 registered patients and processes 1.8 million appointment interactions per year.

## Business Domain Concepts

### User Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Patient** | Registered individuals receiving care | Self-service booking, records access, medication management |
| **Carer / Guardian** | Family members managing a dependant's care | Proxy access, appointment management on behalf of patient |
| **Clinical Staff** | Nurses, GPs, specialists | Inbox management, care plan updates, secure messaging |
| **Front Desk / Admin** | Clinic reception staff | Appointment queue, patient check-in, waitlist management |
| **Clinical Informatics** | Internal analytics team | Aggregate reporting, engagement metrics |

### Appointment Types

- **GP Appointment** — standard 10–15 min slot, bookable by patient up to 4 weeks ahead
- **Specialist Referral** — requires GP referral, booked on behalf of patient by admin
- **Diagnostic / Imaging** — radiology, pathology, booked directly after referral
- **Telehealth** — video consultation, requires video integration
- **Urgent / Walk-in** — same-day, queue-based, no advance booking

### Medical Records & Data

- Patient records are the **source of truth in Epic EHR** (version Hyperdrive 2024)
- Meridian uses **HL7 FHIR R4** as the standard integration interface to Epic
- Lab results are delivered via **Epic → FHIR → Platform** within 4 hours of verification
- Radiology reports are delivered as PDF attachments via the same FHIR pipeline
- Patients may access records for the last **5 years** only (older records available on request)

### Medication Management

- Prescriptions are issued and managed inside Epic
- Repeat prescription requests flow **from patient portal → GP inbox → Epic**
- Controlled substances cannot be requested via the portal (legislative constraint)
- Medication reminders are opt-in and must respect patient communication preferences

### Secure Messaging

- All patient-to-clinician communication is **asynchronous** (not live chat)
- Response SLA is 2 business days for non-urgent messages
- Urgent messages trigger an escalation to the on-call nurse
- Messages become part of the clinical record (stored in Epic)
- Attachments allowed: photos (< 5 MB), PDFs (< 10 MB)

## Compliance & Regulatory Context

### HIPAA (Primary)
- All PHI (Protected Health Information) must be encrypted **at rest and in transit**
- Minimum Necessary Standard: patients only see their own data
- Audit logs required for every PHI access event (who, what, when)
- Patient has the right to access, correct, and download their records (Right of Access)
- Business Associate Agreements (BAA) required for all third-party processors

### GDPR (Secondary — applies to patients in EU territories)
- Consent must be granular: separate opt-ins for marketing, research, and clinical communications
- Right to erasure: non-clinical data can be deleted on request
- Data residency: EU patient data must not leave EU data centres

### Accessibility
- WCAG 2.1 AA compliance mandatory across all patient-facing interfaces
- Screen reader support required (JAWS and VoiceOver)
- Minimum font size 16px, 4.5:1 contrast ratio

## Business Rules

1. A patient must verify their identity via their **date of birth + NHS/MRN number** before accessing records
2. Appointment cancellations within **2 hours of the slot** trigger a no-show flag in Epic
3. A patient may not hold more than **3 future bookings** for the same clinic at the same time
4. Repeat prescription requests must be submitted at least **7 days before** the medication runs out
5. Proxy access (carer/guardian) requires **written consent** from the patient, stored as a scanned document
6. Failed login attempts: account locked after **5 consecutive failures**, unlocked via email verification
7. Session timeout: **15 minutes** of inactivity for web, **30 minutes** for mobile (clinical staff: 8 minutes)
8. Telehealth sessions can only begin when **both patient and clinician** have joined the waiting room

## Integration Landscape

| System | Purpose | Protocol |
|---|---|---|
| **Epic EHR** | Source of truth for records, appointments, prescriptions | HL7 FHIR R4 |
| **Twilio** | SMS and voice notifications | REST API |
| **SendGrid** | Transactional email | REST API |
| **Doxy.me** | Telehealth video sessions | WebRTC / iframe embed |
| **Stripe** | Co-payment collection (outpatient only) | REST API |
| **Apple Health / Google Fit** | Wearable data sync (Phase 2) | HealthKit / Health Connect |
