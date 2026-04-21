# Requirements Prompt — HealthConnect Patient Portal

## How to use this file

Copy the text inside the box below and paste it into the **Requirements Intake** screen of ProductPilot.
Then attach the PDF files from this demo package to the **Domain Context** and **Tech Context** upload areas.

---

## Requirements Text (paste this)

```
Build a secure patient-facing digital health portal for HealthConnect, the digital division of Meridian Health Group.

The portal must allow registered patients and their authorised carers to:

1. APPOINTMENT MANAGEMENT
   - Search for and book GP appointments up to 4 weeks in advance
   - View, reschedule and cancel upcoming appointments (cancellation within 2 hours triggers Epic no-show flag)
   - Join telehealth video consultations directly within the portal (Doxy.me)
   - Receive automated SMS and email reminders 24 hours and 2 hours before each appointment
   - View waitlist position for overbooked clinics

2. MEDICAL RECORDS ACCESS
   - View lab results and radiology reports (last 5 years; delivered via Epic FHIR R4 pipeline)
   - Download a summary of their health record in PDF format (Right of Access — HIPAA)
   - Request corrections to demographic and contact information
   - View current medications and active care plans

3. REPEAT PRESCRIPTION REQUESTS
   - Submit repeat prescription requests to the GP inbox (minimum 7 days before medication runs out)
   - Track request status (submitted → GP reviewed → approved / rejected → dispensed)
   - Opt in to medication reminders aligned to their prescription schedule
   - Controlled substances cannot be requested through the portal

4. SECURE MESSAGING
   - Send asynchronous messages to their care team (text + photo/PDF attachments)
   - Receive responses within the 2-business-day SLA; urgent escalation to on-call nurse
   - View full message history; messages become part of the clinical record in Epic

5. CARER / PROXY ACCESS
   - A patient may grant a carer or guardian proxy access to their account
   - Proxy access requires written consent (scanned document upload) and explicit approval by admin
   - Proxy can book appointments, view records, and send messages on behalf of the patient

6. ACCOUNT & IDENTITY
   - Registration with NHS/MRN number + date of birth identity verification
   - Multi-factor authentication (SMS OTP or authenticator app)
   - Account lockout after 5 consecutive failed logins; self-service unlock via email
   - Session timeout: 15 minutes (web), 30 minutes (mobile)
   - Granular consent management: separate opt-ins for clinical communications, research, marketing

7. CO-PAYMENT COLLECTION
   - Outpatient visits may require a co-payment collected at booking via Stripe
   - Payment confirmation email sent via SendGrid; receipt stored against appointment record
   - Failed payments block booking completion and show retry prompt

8. ACCESSIBILITY & COMPLIANCE
   - WCAG 2.1 AA throughout all patient-facing screens
   - Full screen reader support (JAWS and VoiceOver)
   - All PHI encrypted at rest (AES-256) and in transit (TLS 1.3)
   - HIPAA audit log for every PHI access event
   - EU patient data must remain in eu-west-1 (GDPR data residency)

The portal will be a Progressive Web App (React 18) with a companion native wrapper for iOS and Android. Backend services are AWS Lambda + PostgreSQL, integrated to Epic EHR via HL7 FHIR R4. Notifications use Twilio (SMS) and SendGrid (email).

Phase 1 covers items 1–6. Phase 2 adds item 7 (payments) and Apple Health / Google Fit wearable sync.
```

---

## Suggested Answers to Clarifying Questions

When ProductPilot generates clarifying questions, here are suggested answers to drive a realistic demo:

| Question theme | Suggested answer |
|---|---|
| Primary users | Registered patients (420 k), their carers/guardians, and front-desk admin staff |
| Compliance constraints | HIPAA (primary), GDPR for EU patients, WCAG 2.1 AA accessibility |
| Integration with existing systems | Epic EHR via HL7 FHIR R4; Twilio SMS; SendGrid email; Doxy.me telehealth; Stripe payments |
| Offline / connectivity | PWA with offline read-only access to upcoming appointments and latest lab results |
| Release strategy | Phase 1 MVP in 6 months (items 1–6); Phase 2 in month 9 (payments + wearables) |
| Mobile vs web | Progressive Web App first; native iOS/Android shell (Capacitor) wrapping the PWA |
| Analytics / reporting | HIPAA-compliant engagement metrics for Clinical Informatics team; no individual-level export |
| Notifications | SMS (Twilio) + email (SendGrid); patient can opt out per channel; no marketing without explicit consent |
