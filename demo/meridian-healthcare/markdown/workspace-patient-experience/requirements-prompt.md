# Requirements Prompt — Meridian Health Group Patient Experience Team

## How to use this file

1. In ProductPilot, go to **Settings → Enterprise Context** and paste `enterprise/enterprise-domain-context.md` into the Domain Context field. Paste `enterprise/enterprise-tech-context.md` into the Tech Context field.
2. Select or create the **Patient Experience** workspace. Paste `workspace-patient-experience/domain-context.md` into its Domain Context field and `workspace-patient-experience/tech-context.md` into its Tech Context field.
3. Copy the requirements text below and paste it into the **Requirements Intake** screen.

---

## Requirements Text (paste this)

```
Build a secure patient-facing digital health portal for HealthConnect, the digital platform of Meridian
Health Group — a regional hospital network with 3 hospitals, 12 clinics, and 420,000 registered patients.

The portal is a Progressive Web App (React 18 + Workbox) with a Capacitor native shell for iOS and Android.
All clinical data lives in Epic EHR (FHIR R4) — HealthConnect does not store clinical data permanently.

Scope for this initiative:

1. APPOINTMENT MANAGEMENT
   - Book, view, reschedule, and cancel GP appointments (up to 4 weeks ahead, 10–15 min slots)
   - Join telehealth video consultations via Doxy.me embedded in the portal
   - Automated SMS + email reminders 24 hours and 2 hours before each appointment (Twilio + SendGrid)
   - Cancellation within 2 hours triggers an Epic no-show flag (FHIR write-back)
   - View waitlist position for overbooked clinics; receive notification when a slot opens
   - Co-payment collection at booking for applicable outpatient visit types (Stripe Payment Intent)
   - Booking is only confirmed after both Stripe payment success AND successful FHIR write to Epic
   - If FHIR write fails after payment, automatically refund via Stripe within 5 seconds

2. MEDICAL RECORDS ACCESS
   - View lab results (verified by Epic only; DiagnosticReport.status = final) — available within 4 hours of Epic verification
   - View radiology reports (PDF via FHIR DocumentReference pipeline)
   - View current medications and active care plans (read-only)
   - Download a PDF summary of health record (HIPAA Right of Access)
   - Request corrections to demographic and contact information (routed to admin staff for review)
   - Records from the last 5 years; older records available on request

3. REPEAT PRESCRIPTION REQUESTS
   - Submit repeat prescription requests (minimum 7 days before running out)
   - Track status: Submitted → GP Reviewed → Approved / Rejected → Dispensed
   - Controlled substances cannot be requested via the portal — display a message directing the patient to their GP
   - Opt-in medication reminders aligned to prescription schedule

4. SECURE MESSAGING
   - Async patient-to-care-team messaging (text + attachments: photos < 5 MB, PDFs < 10 MB)
   - Response SLA: 2 business days (displayed as a banner); urgent escalation to on-call nurse within 15 minutes
   - Messages stored as FHIR Communication resources in Epic; patient informed messages become part of clinical record
   - All attachments virus-scanned (ClamAV Lambda) before delivery; infected files rejected and patient notified

5. PROXY / CARER ACCESS
   - Patient grants proxy access to a carer/guardian; requires scanned consent form upload + admin approval
   - Proxy can book appointments, view records, and send messages on behalf of the patient
   - Patient can revoke proxy access at any time; revocation takes effect immediately
   - All proxy actions logged in Audit Service with both patientId and proxyUserId

6. ACCOUNT & IDENTITY
   - Registration: NHS/MRN number + date of birth identity verification
   - MFA mandatory: SMS OTP or TOTP authenticator app
   - Account lockout after 5 consecutive failed logins; self-service unlock via email
   - Session timeout: 15 minutes (web), 30 minutes (mobile)
   - Granular consent management: separate opt-ins for clinical communications, research, and marketing

Platform integrations: FHIR Adapter → Epic EHR (FHIR R4 + OAuth 2.0 SMART on FHIR),
Doxy.me (telehealth), Stripe (co-payments), Twilio (SMS), SendGrid (email), AWS Cognito (identity),
AWS EventBridge (domain events), S3 SSE-KMS (attachments), ClamAV Lambda (virus scanning).

Phase 1 (6 months): appointment booking, records access (labs + radiology), secure messaging, account management, MFA.
Phase 2 (months 7–10): proxy access, co-payment collection (Stripe), repeat prescriptions, offline PWA cache, Apple Health / Google Fit sync.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Clinical data storage | HealthConnect does not store PHI permanently; Epic is the source of record; all clinical data fetched from Epic via FHIR R4 on demand or polled every 15 minutes |
| Lab result display | Only show results after Epic verification (DiagnosticReport.status = final); never show interim or unverified results |
| Booking + payment atomicity | Stripe payment first; FHIR write second; if FHIR fails after payment, auto-refund within 5 seconds; slot held with 5-minute Redis TTL during checkout |
| Controlled substances | Hard block — portal shows message directing patient to GP; no form presented; logged in Audit Service |
| Proxy access approval | Admin staff approval required (not auto-grant); proxy request queue managed in Care Coordination portal |
| Telehealth | Doxy.me iframe embed; session token generated server-side by Telehealth Service; valid 60 minutes from appointment start |
| Phasing | Phase 1 (6 months): booking, records, messaging, auth; Phase 2 (months 7–10): proxy access, Stripe co-payments, prescriptions, PWA offline, wearables |
