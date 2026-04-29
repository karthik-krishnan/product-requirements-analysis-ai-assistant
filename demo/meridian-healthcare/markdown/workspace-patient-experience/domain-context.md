# Meridian Health Group — Patient Experience Team: Domain Context

## Team Scope

The Patient Experience Team owns the **patient-facing digital portal** — a Progressive Web App (PWA) with native iOS/Android wrappers — covering appointment booking, medical records access, repeat prescription requests, secure messaging with care teams, proxy access for carers, and co-payment collection. All clinical data is read from and written back to Epic EHR via the FHIR Adapter.

---

## Team Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Patient** | Registered individual receiving care at Meridian | Book and manage appointments, view lab results, request prescriptions, message their care team |
| **Carer / Guardian** | Family member or guardian managing a dependent's care; requires proxy access | Book appointments, view records, send messages on behalf of the patient; same access as patient but clearly labeled as proxy |

---

## Appointment Management

### Appointment Types Available to Patients

| Type | Lead Time | Notes |
|---|---|---|
| **GP Appointment** | Bookable up to 4 weeks ahead | Standard 10–15 min slot; bookable directly by patient |
| **Telehealth** | Same as GP | Video consultation via Doxy.me; patient joins from portal |
| **Diagnostic / Imaging** | After referral | Radiology or pathology; booked after GP referral; slot selected by patient from available windows |
| **Urgent / Walk-in** | Same-day only | Queue-based; no advance booking; patient can see estimated wait time |

- **Specialist Referral** bookings: initiated by admin staff on behalf of the patient after a GP referral; patient is notified when a slot is confirmed (not self-service in Phase 1)

### Booking Rules
- Cancellation within **2 hours** of appointment triggers a no-show flag in Epic (written back via FHIR `Appointment.status = noshow`)
- Rescheduling counts as cancellation + rebook; same 2-hour rule applies
- Automated reminders: SMS + email 24 hours before and 2 hours before each appointment
- Waitlist: if all slots for a clinic are booked, patient can join a waitlist; notified if a slot opens up

---

## Medical Records Access

- Patients can view records for the **last 5 years** (older records available on request via branch/admin)
- **Lab results**: displayed within 4 hours of Epic verification (polling every 15 minutes via FHIR Adapter)
- **Radiology reports**: delivered as PDFs via the same FHIR pipeline (polling every 30 minutes)
- **Medication list**: current active medications from Epic `MedicationRequest` resources
- **Care plans**: active care plans from Epic `CarePlan` resources; read-only view for patient
- **Record download**: patient can download a PDF summary of their health record (HIPAA Right of Access)
- **Corrections**: patient can request corrections to demographic and contact information; request goes to admin staff for review (not auto-applied)

---

## Repeat Prescription Requests

- Patient submits a repeat prescription request via the portal (minimum 7 days before medication runs out)
- Request lifecycle: Submitted → GP Reviewed → Approved / Rejected → Dispensed
- Patient sees status in real time (polled from Epic via FHIR Adapter)
- Approved prescriptions: patient is notified when prescription is ready for collection at their nominated pharmacy
- **Controlled substances cannot be requested via the portal** — legislative constraint; patient shown a message directing them to contact their GP directly
- Medication reminders: opt-in; patient sets their own schedule; aligned to prescription frequency

---

## Secure Messaging

- Patients can send asynchronous text messages and attachments to their care team (GP or specialist)
- Attachments: photos < 5 MB, PDFs < 10 MB; stored in S3 SSE-KMS; delivered via pre-signed URL (5-minute TTL)
- Response SLA: **2 business days** for non-urgent messages; displayed as a banner on the messaging screen
- **Urgent escalation**: Messaging Service detects an urgent flag (set by clinical staff on reply) and triggers an immediate Twilio SMS to the patient
- Message history: full thread visible to patient; stored as FHIR `Communication` resources in Epic
- **Messages become part of the clinical record** — patients are informed of this before sending

---

## Proxy / Carer Access

- A patient may grant a carer or guardian proxy access to their HealthConnect account
- **Consent flow**: patient uploads a scanned consent form; Admin staff manually approves the proxy grant (not auto-approved)
- Proxy can: book appointments, view records (up to 5 years), view and send messages on behalf of the patient
- All proxy actions are logged in the Audit Service with both `patientId` and `proxyUserId`
- A patient may revoke proxy access at any time from their account settings; revocation takes effect immediately

---

## Co-Payment Collection

- Certain outpatient visit types require a co-payment collected at the time of booking (via Stripe)
- Payment is required to complete the booking; failed payment blocks booking completion and shows a retry prompt
- Payment confirmation email sent via SendGrid; digital receipt stored against the appointment record
- **Inpatient billing is handled entirely by Epic** — out of scope for HealthConnect

---

## Account & Identity

- Registration: NHS/MRN number + date of birth for identity verification
- MFA: mandatory — SMS OTP or TOTP authenticator app
- Account lockout: 5 consecutive failed logins; self-service unlock via email verification
- Session timeout: 15 minutes (web), 30 minutes (mobile)
- **Consent management**: granular opt-ins for clinical communications, research participation, and marketing — stored in Cognito user attributes and respected by the Notification Service

---

## Business Rules Specific to Patient Experience

1. Cancellations within **2 hours** trigger an Epic no-show flag (FHIR write-back); patients who accumulate 3 no-shows in 12 months are flagged to admin staff
2. Lab results are displayed to the patient **only after Epic verification** — unverified or interim results must not be shown
3. Controlled substance prescription requests: the portal must present a clear message ("This medication cannot be requested online — please contact your GP directly") before the patient types any request
4. Proxy access must require **admin approval** before the proxy can access the patient's account — no self-service grant
5. Co-payment must be collected **before the booking is confirmed** in Epic; if the booking confirmation to Epic fails, the Stripe payment is automatically refunded
6. All message attachments must be **virus-scanned** (ClamAV lambda on upload) before being stored or delivered
