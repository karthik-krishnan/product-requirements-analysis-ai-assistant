# Meridian Health Group — Enterprise Domain Context

## About the Organization

**Meridian Health Group** is a regional hospital network operating **3 acute-care hospitals** and **12 outpatient clinics** across the Southeast US, serving approximately **420,000 registered patients** and processing **1.8 million appointment interactions per year**.

The **HealthConnect** digital platform is Meridian's patient- and clinician-facing technology layer. It is built as a modern cloud-native application that integrates with **Epic EHR** (version Hyperdrive 2024) as the authoritative source of record for all clinical data. HealthConnect uses **HL7 FHIR R4** as the standard integration interface to Epic.

Two product teams build on the HealthConnect platform:
- **Patient Experience Team** — patient-facing portal (web + mobile), appointments, records access, secure messaging
- **Care Coordination Team** — clinician and admin portal, referral workflows, care team management, care plans

---

## Enterprise User Personas

| Persona | Team | Description |
|---|---|---|
| **Patient** | Patient Experience | Registered individual receiving care; self-service booking and records access |
| **Carer / Guardian** | Patient Experience | Family member managing a dependent's care; requires proxy access grant |
| **Clinical Staff (GP / Specialist / Nurse)** | Care Coordination | Manages care plans, clinical inbox, referrals, and secure messaging |
| **Front Desk / Admin** | Care Coordination | Handles appointment scheduling, patient check-in, and waitlist management |
| **Clinical Informatics** | Both | Internal analytics team; aggregate reporting; no individual-level PHI access |

---

## Clinical Source of Record — Epic EHR

- **Epic** (Hyperdrive 2024) is the authoritative source of truth for all patient records, appointments, medications, lab results, and care plans
- **HealthConnect does not store clinical data** — it is a presentation and workflow layer that reads from and writes back to Epic via FHIR R4
- Epic FHIR resources used: `Patient`, `Appointment`, `MedicationRequest`, `DiagnosticReport`, `Observation`, `DocumentReference`, `Communication`, `CarePlan`, `Referral`
- Polling cadence: lab results every 15 minutes; radiology PDFs every 30 minutes
- Write-back: appointment cancellations, prescription requests, message threads (stored as `Communication` resources in Epic)

---

## Company-Wide Compliance & Regulatory Framework

### HIPAA (Primary)
- All **PHI (Protected Health Information)** must be encrypted at rest and in transit
- **Minimum Necessary Standard**: patients only see their own data; clinical staff see only the patients in their care
- **Audit logs required** for every PHI access event (who, what, when, source IP)
- Patient has the right to access, correct, and download their records (HIPAA Right of Access)
- **Business Associate Agreements (BAA)** required for all third-party processors (AWS, Twilio, SendGrid, Doxy.me, Stripe)
- Patient identifiers stored as MRN tokens within HealthConnect; plain MRN used only at the FHIR Adapter boundary

### GDPR (EU Patients)
- EU patient data must remain in **eu-west-1** (AWS Ireland); data residency enforced at the infrastructure layer
- Right to erasure: patient may request deletion of HealthConnect account data (Epic data governed separately by clinical records laws)
- Consent management: separate opt-ins for clinical communications, research participation, and marketing

### Accessibility
- WCAG 2.1 AA on all patient-facing interfaces
- Full screen reader support (JAWS and VoiceOver) tested in CI via axe-core

---

## Enterprise Communication Policies

- All patient-to-clinician communication is **asynchronous** (not live chat)
- Response SLA: **2 business days** for non-urgent messages; urgent escalation to on-call nurse within 15 minutes
- Messages become part of the **clinical record** (stored as FHIR `Communication` resources in Epic)
- Controlled substances cannot be requested via any digital channel — legislative requirement
- All communications respect patient preference flags (email / SMS / push); no marketing without explicit opt-in consent

---

## Enterprise Integration Landscape

| System | Purpose | Primary Team |
|---|---|---|
| **Epic EHR (FHIR R4)** | Clinical source of record — appointments, records, medications, lab results | Both (via FHIR Adapter) |
| **Doxy.me** | Telehealth video consultation platform | Patient Experience |
| **Twilio** | SMS notifications — appointment reminders, urgent message alerts | Both |
| **SendGrid** | Transactional email — booking confirmations, lab notifications, password reset | Both |
| **Stripe** | Co-payment collection at booking (outpatient visits) | Patient Experience |
| **Apple Health / Google Fit** | Wearable health data sync (Phase 2) | Patient Experience |
| **AWS Cognito** | Patient identity and authentication | Both (shared) |
| **AWS EventBridge** | Domain event bus — appointments, messages, lab results | Both (shared) |
