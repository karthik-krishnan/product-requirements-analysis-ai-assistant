# Requirements Prompt — Meridian Health Group Care Coordination Team

## How to use this file

1. In ProductPilot, go to **Settings → Enterprise Context** and paste `enterprise/enterprise-domain-context.md` into the Domain Context field. Paste `enterprise/enterprise-tech-context.md` into the Tech Context field.
2. Select or create the **Care Coordination** workspace. Paste `workspace-care-coordination/domain-context.md` into its Domain Context field and `workspace-care-coordination/tech-context.md` into its Tech Context field.
3. Copy the requirements text below and paste it into the **Requirements Intake** screen.

---

## Requirements Text (paste this)

```
Build the HealthConnect Care Coordination Portal — an internal role-gated web application for clinical
and administrative staff at Meridian Health Group (GPs, specialists, nurses, and front desk admins).

All clinical workflows write back to Epic EHR via HL7 FHIR R4. The portal is not a clinical record
system — it is a workflow orchestration layer on top of Epic.

Scope for this initiative:

1. CLINICAL INBOX
   - Unified inbox per clinician aggregating: patient secure messages, repeat prescription requests pending GP review, inbound referral notifications, and care plan task assignments
   - Items color-coded and sorted by type and urgency
   - Urgent messages: appear at top of inbox; trigger SMS alert to on-call nurse (Twilio)
   - SLA tracking: items without a response after 2 business days are highlighted in red
   - Real-time badge update when new inbox items arrive (GraphQL subscription via AppSync)
   - Replies stored as FHIR Communication resources in Epic (FHIR write-back via FHIR Adapter)

2. REFERRAL WORKFLOW
   - GP creates a referral specifying: referral type (specialist, diagnostic, imaging), clinical indication, urgency (routine / urgent / emergency), and preferred clinic/facility
   - Referral written to Epic as a FHIR ServiceRequest resource
   - Admin receives referral in the booking queue; matches to available specialist slot; confirms appointment (FHIR Appointment write-back)
   - Patient notified via SMS + email once specialist appointment is confirmed
   - Urgency SLAs: Routine — booked within 5 business days; Urgent — 1 business day; Emergency — same/next day
   - Overdue referrals (not booked within SLA) highlighted in admin queue
   - Urgent referral: specialist receives immediate inbox notification; if unread after 30 minutes, supervisor receives escalation SMS

3. CARE PLAN MANAGEMENT
   - Clinicians create and update care plans (goals, conditions, activities, assigned team members)
   - Care plans written to Epic as FHIR CarePlan resources; read-only view surfaced to patients in the patient portal
   - Tasks assigned to named clinicians (not roles); task completion tracked in the portal
   - Care plan review date alerts: inbox notification 7 days before a review is due
   - SMART on FHIR context scoping: clinicians only access records of patients in their care

4. APPOINTMENT QUEUE & PATIENT CHECK-IN
   - Front Desk view: today's appointment schedule for the clinic; real-time status (scheduled / arrived / in consultation / completed)
   - Patient check-in: admin marks patient as arrived; FHIR Appointment.status = arrived write-back
   - Walk-in queue: urgent/walk-in patients added to a real-time queue; estimated wait time displayed on a waiting room screen
   - No-show: admin prompted 15 minutes after appointment time if patient has not checked in; admin confirms before FHIR no-show write-back (not automatic)
   - Waiting Room Display: public-facing screen showing only queue number and estimated wait (no PHI)

5. WAITLIST MANAGEMENT
   - When a freed slot becomes available, admin offers it to the next patient on the waitlist
   - Patient receives SMS alert (Twilio) with a 30-minute response window; if not confirmed, slot offered to next patient
   - Admin sees waitlist per clinic per day with queue position and patient contact details

6. PROXY ACCESS APPROVAL
   - Proxy access requests from the patient portal land in an admin approval queue
   - Admin reviews the uploaded consent form (virus-scanned by ClamAV Lambda before display)
   - Approval or rejection updates Cognito (custom:proxyFor attribute); patient and proxy notified
   - Admin can view and revoke all active proxy grants for their clinic's patients

Platform integrations: FHIR Adapter → Epic EHR (FHIR R4, SMART on FHIR), AWS AppSync (GraphQL subscriptions for real-time inbox),
AWS Cognito (role-based access + proxy grants), Twilio (urgent escalation + waitlist SMS), SendGrid (referral confirmation email),
ClamAV Lambda (proxy consent form virus scan), AWS EventBridge (domain events).

Phase 1 (6 months): clinical inbox, referral workflow (create + admin booking), appointment queue and check-in, walk-in queue.
Phase 2 (months 7–10): care plan management, waitlist management, proxy access approval, waiting room display, care plan review date alerts.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Clinical data storage | Portal does not store PHI; all clinical data in Epic via FHIR R4; portal stores workflow state only (referral status, task assignments, queue position) |
| FHIR write-back latency | Target: FHIR writes confirmed within 3 seconds of clinician action; optimistic UI updates while write completes |
| SMART on FHIR enforcement | FHIR Adapter validates that the requesting clinician's practitionerId matches the patient's care team (Appointment.participant or CarePlan.author) before returning any PHI |
| Urgent escalation | Unread urgent inbox item after 30 minutes: Lambda scheduled check triggers Twilio SMS to specialist's supervisor; logged in Audit Service |
| No-show handling | 15-minute prompt is advisory — admin must confirm before Epic write; never automatic |
| Walk-in queue | Queue state in DynamoDB for real-time reads; no PHI on waiting room display — only queue number and estimated wait |
| Proxy approval | Admin reviews consent form (ClamAV scanned first); approval = Cognito attribute update; confirmation within 3 seconds |
| Phasing | Phase 1 (6 months): inbox, referrals, check-in, walk-in queue; Phase 2 (months 7–10): care plans, waitlist, proxy approval, waiting room display |
