# HealthConnect — Patient Journey Map

**Document type**: UX Research / Business Analysis  
**Version**: 2.1  
**Last reviewed**: Q1 2026  
**Owner**: HealthConnect Product Team

---

## Overview

This document maps the end-to-end journeys of a registered patient across the five primary touchpoints of the HealthConnect patient portal. It is intended to inform story writing, acceptance criteria, and prioritisation.

---

## Journey 1 — First-Time Registration and Identity Verification

### Persona: Sarah, 42, managing a chronic condition

**Goal**: Create a portal account and link it to her existing Meridian Health patient record.

| Step | Action | System | Outcome | Pain point today |
|------|--------|--------|---------|-----------------|
| 1 | Visits portal URL from appointment reminder letter | Browser | Landing page loads | Letter URL is hard to remember |
| 2 | Clicks "Create Account" | Auth Service | Registration form shown | — |
| 3 | Enters name, email, date of birth, MRN number | Auth Service | Identity checked against Epic | Unclear error if MRN format is wrong |
| 4 | Receives SMS OTP for MFA setup | Twilio | OTP verified | Doesn't know SMS is coming |
| 5 | Sets password and accepts terms | Auth Service | Account created; Cognito record linked to MRN | Terms are too long |
| 6 | Lands on dashboard | Patient App | Upcoming appointments visible | No onboarding tour |

**Acceptance criteria to derive:**
- Identity verification must match DOB + MRN against Epic Patient resource before account creation
- MFA must be set up before first login completes
- Clear error messages for each failure mode (MRN not found, DOB mismatch, duplicate account)
- Onboarding checklist widget on first-login dashboard

---

## Journey 2 — Booking a GP Appointment

### Persona: David, 67, retired, books appointments for himself and his wife (proxy)

**Goal**: Book a face-to-face GP slot within the next 2 weeks.

| Step | Action | System | Outcome |
|------|--------|--------|---------|
| 1 | Logs in; sees appointment widget | Patient App | — |
| 2 | Selects "Book GP Appointment" | Appointment Service | Available slots fetched from Epic via FHIR |
| 3 | Filters by preferred GP and date range | Appointment Service | Slot grid rendered |
| 4 | Selects a slot and confirms | Appointment Service | Booking written to Epic; confirmation email sent |
| 5 | Receives email + SMS confirmation | SendGrid / Twilio | — |
| 6 | Receives reminder 24 h before | Notification Service | — |
| 7 | Receives reminder 2 h before | Notification Service | — |

**Business rules in scope:**
- Patient may not hold more than 3 future bookings for the same clinic simultaneously
- Cancellation within 2 hours of the slot triggers a no-show flag in Epic via FHIR write-back
- Slot availability is cached in Redis for 60 seconds; live re-check on confirmation

**Edge cases:**
- Slot taken between selection and confirmation → show next available slot, do not double-book
- Patient has 3 existing bookings → block booking and show count + option to cancel an existing one
- GP becomes unavailable after booking → Notification Service sends rescheduling prompt

---

## Journey 3 — Viewing Lab Results and Downloading Records

### Persona: Sarah (same as Journey 1)

**Goal**: Check her latest blood panel results that her GP ordered last week.

| Step | Action | System | Outcome |
|------|--------|--------|---------|
| 1 | Navigates to "My Health" → "Lab Results" | Patient App | Results list loaded from FHIR Adapter cache |
| 2 | Selects the most recent panel | FHIR Adapter | `DiagnosticReport` resource fetched from Epic |
| 3 | Reads result values with reference ranges | Patient App | Out-of-range values highlighted |
| 4 | Taps "Download my records" | File Store | PDF generated server-side; pre-signed S3 URL issued (5 min TTL) |
| 5 | PDF opens in browser / saved to device | — | PHI access event logged to Audit Service |

**Acceptance criteria to derive:**
- Lab results available within 4 hours of Epic verification
- Only results from the last 5 years displayed by default; older records available on request via admin
- Every view of a lab result must emit an audit event: patient MRN (tokenised), resource ID, timestamp, IP
- Download PDF must include the Meridian Health branding header and result reference ranges
- Pre-signed URL must expire after 5 minutes to prevent URL sharing

---

## Journey 4 — Requesting a Repeat Prescription

### Persona: Marcus, 55, on long-term blood pressure medication

**Goal**: Request a repeat prescription 10 days before his current supply runs out.

| Step | Action | System | Outcome |
|------|--------|--------|---------|
| 1 | Navigates to "Medications" | Prescription Service | Current medication list fetched from Epic `MedicationRequest` |
| 2 | Selects medication → "Request Repeat" | Prescription Service | Checks: not a controlled substance; ≥7 days before estimated run-out |
| 3 | Adds note to GP (optional) | Prescription Service | Request queued |
| 4 | Request submitted to GP inbox in Epic | FHIR Adapter | `MedicationRequest` resource created with `intent: refill-request` |
| 5 | GP reviews and approves in Epic | Epic EHR | Status updated to `active` |
| 6 | Patient notified via email | Notification Service | "Your prescription is ready for collection" |

**Business rules in scope:**
- Request must be submitted at least 7 days before estimated run-out (calculated from days-supply on last dispense)
- Controlled substances (`MedicationRequest.category = controlled`) cannot be requested via portal — button hidden, explanatory message shown
- Patient receives SMS notification when GP approves or rejects

---

## Journey 5 — Carer / Proxy Access Setup

### Persona: Emma, 38, caring for her elderly father who lacks digital confidence

**Goal**: Get proxy access to her father's account to manage his appointments.

| Step | Action | System | Outcome |
|------|--------|--------|---------|
| 1 | Father logs into his account | Auth Service | — |
| 2 | Navigates to "Account" → "Manage Access" | Auth Service | Proxy access panel shown |
| 3 | Clicks "Add carer" and enters Emma's email | Auth Service | Invite email sent to Emma |
| 4 | Emma receives invite, creates own account | Auth Service | Emma's account created; pending consent |
| 5 | Father uploads signed consent form (scanned PDF) | File Store | Document stored in S3; admin notified |
| 6 | Admin reviews consent document in Admin Portal | Auth Service | Proxy relationship activated |
| 7 | Emma logs in; switches to father's profile | Patient App | Full proxy view of father's records |

**Acceptance criteria to derive:**
- Proxy relationship not active until admin explicitly approves the scanned consent document
- Proxy can perform: view records, book/cancel appointments, send messages, view lab results
- Proxy cannot: change father's password, add further proxies, request controlled substances
- Proxy access audit log entries must record both the proxy MRN and the patient MRN
- Father can revoke proxy access at any time; immediate effect on next request

---

## Emotional Journey Summary

| Journey | High point | Low point | Opportunity |
|---------|-----------|-----------|-------------|
| Registration | Account linked — "my data is here" | Confusing MRN format error | Clear inline format hint + example |
| Booking | Instant confirmation | Slot gone between selection & confirm | Optimistic lock + graceful retry |
| Lab results | "I can read my own results" | Medical jargon in result values | Lay-language tooltip per test type |
| Prescription | No more calling the surgery | Uncertainty about approval timeline | Real-time status tracker |
| Proxy setup | Relief — "I can help Dad" | Waiting for admin to approve document | Target: same-day admin review SLA |
