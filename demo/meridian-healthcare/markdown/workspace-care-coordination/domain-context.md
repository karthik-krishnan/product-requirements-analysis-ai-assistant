# Meridian Health Group — Care Coordination Team: Domain Context

## Team Scope

The Care Coordination Team owns the **clinician and administrative staff portal** — a role-gated internal web application for GPs, specialists, nurses, and front desk staff. The team covers the clinical inbox, referral workflows, care plan management, patient check-in, waitlist management, and staff scheduling. All workflows write back to Epic EHR via the FHIR Adapter.

---

## Team Personas

| Persona | Description | Key Needs |
|---|---|---|
| **GP (General Practitioner)** | Primary care physician; manages a panel of registered patients | Clinical inbox (messages, prescription requests), referral initiation, care plan authoring |
| **Specialist** | Receives referred patients; manages specialist appointment slots | Referral inbox, patient record context before appointment, care plan updates |
| **Nurse / Clinical Support** | Assists GPs and specialists; triages urgent messages | Urgent message queue, care plan task updates, patient check-in support |
| **Front Desk / Admin** | Reception staff at clinic or hospital | Appointment queue, patient walk-in check-in, waitlist management, proxy access approval |
| **Clinical Informatics** | Internal analytics team | Aggregate reporting (no individual PHI access); engagement metrics; wait time trends |

---

## Clinical Inbox

- Each clinician (GP, Specialist, Nurse) has a personal **clinical inbox** aggregated from:
  - Patient secure messages (from the Patient Experience portal)
  - Repeat prescription requests pending GP review
  - Referral notifications (new inbound referrals)
  - Task assignments from care plans
- Inbox items are color-coded by type and urgency
- **Urgent messages** escalated from the Messaging Service appear at the top of the inbox and trigger an SMS alert to the on-call nurse via Twilio
- Response SLA tracking: inbox items older than 2 business days without a response are highlighted in red
- Messages are stored as FHIR `Communication` resources in Epic; replies from clinicians are written back via FHIR Adapter

---

## Referral Workflow

- **Initiation**: GP creates a referral from the patient's record in the clinician portal; specifies: referral type (specialist, diagnostic, imaging), clinical indication, urgency (routine / urgent / emergency), and preferred clinic/facility
- The referral is written to Epic as a FHIR `ServiceRequest` resource
- **Admin assignment**: Front Desk Admin receives the referral in the admin queue; matches it to an available specialist slot and books the appointment (FHIR `Appointment` write-back)
- **Patient notification**: once the specialist appointment is confirmed, the patient receives an SMS + email with the appointment details
- **Specialist view**: specialist sees incoming referrals in their inbox; referral includes patient record context (relevant FHIR resources)

### Referral Urgency Routing
| Urgency | Target booking time | Admin SLA |
|---|---|---|
| **Routine** | Within 6 weeks | Booked within 5 business days |
| **Urgent** | Within 2 weeks | Booked within 1 business day |
| **Emergency** | Same day / next day | Admin alerts on-call scheduler immediately |

---

## Care Plan Management

- Clinicians create and update **care plans** for patients with chronic or complex conditions
- Care plans consist of: goals, conditions, activities (medication reviews, follow-up appointments, lifestyle targets), and assigned team members
- Care plans are stored as FHIR `CarePlan` resources in Epic; patients see a read-only view in the Patient Experience portal
- **Tasks** within a care plan can be assigned to specific team members (GP, nurse, admin); task completion is tracked in the portal
- Care plan **review date** alerts: clinician receives an inbox notification 7 days before a care plan review is due

---

## Appointment Queue & Patient Check-In

- **Front Desk view**: displays today's appointment schedule for their clinic, sorted by time; real-time status (scheduled / arrived / in consultation / completed)
- **Check-in**: admin marks a patient as "arrived" when they present at reception; status written back to Epic (`Appointment.status = arrived`)
- **Walk-in queue**: urgent/walk-in patients are added to a separate real-time queue; queue position and estimated wait time displayed on a waiting room screen
- **No-show handling**: if a patient has not checked in within 15 minutes of their appointment time, admin is prompted to mark the appointment as a no-show (writes Epic `Appointment.status = noshow`)

---

## Waitlist Management

- When a clinic's slots are fully booked, patients can join a waitlist (managed via Patient Experience portal)
- Front Desk Admin sees the waitlist per clinic per day; can offer a freed slot to the next person on the list
- Waitlist notification: when the admin offers a slot, the patient receives an SMS alert with a 30-minute response window; if not confirmed, the slot goes to the next patient on the list

---

## Proxy Access Approval (Admin Workflow)

- Proxy access requests submitted by patients in the Patient Experience portal land in the admin approval queue
- Admin reviews the uploaded consent form and either approves or rejects
- Approval triggers a Cognito attribute update (handled by Auth Service)
- Admin can view all active proxy grants for their clinic's patients and revoke on behalf of the patient if needed

---

## Business Rules Specific to Care Coordination

1. Referral urgency level determines the admin SLA; the portal highlights overdue referrals (not booked within target) in the admin queue
2. A clinician cannot access a patient's record via the portal unless the patient is **in their care** (registered under their practice or referred to their clinic) — enforced at the FHIR Adapter level (SMART on FHIR context scoping)
3. No-show flagging at 15 minutes is a **prompt to admin** — admin must confirm before the Epic write-back occurs; it is not automatic
4. Care plan task assignments must have a **named responsible clinician** — tasks cannot be assigned to a role (e.g., "the nurse") without a specific user ID
5. Urgent referrals generate an **immediate inbox notification** to the receiving specialist (not just a daily digest); no-read within 30 minutes triggers escalation to the specialist's supervisor
