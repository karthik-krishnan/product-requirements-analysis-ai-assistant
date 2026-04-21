# ProductPilot Demo Script — HealthConnect Patient Portal

**Time**: ~8 minutes end-to-end  
**Audience**: Product managers, engineering leads, potential customers  
**Mode**: Demo provider (no API key required)

---

## Before You Start

1. Open ProductPilot in your browser
2. Have this folder open in a file browser — you'll drag-and-drop files during the demo
3. Optional: open `domain-context.md` and `technical-context.md` side-by-side to talk through them

**Files in this package:**

| File | Used as | Upload to |
|------|---------|-----------|
| `domain-context.md` | Business domain knowledge | Domain Context — text area or file upload |
| `technical-context.md` | Platform architecture reference | Tech Context — text area or file upload |
| `patient-journey.md` | Stakeholder UX research doc | Domain Context — file upload |
| `compliance-and-security.md` | Regulatory constraints doc | Domain Context — file upload |
| `requirements-prompt.md` | Source of the requirements text | Paste into Requirements Intake screen |

---

## Step 1 — Configure Domain Context (~1 min)

1. Click the **Settings** icon (top right)
2. Confirm the provider is set to **Demo** (no API key needed)
3. Set **Assistance Level** to **Balanced** (middle of slider) — you'll change this later to show the effect

4. Click **Domain Context** tab (or section heading)
5. **Option A (quick)**: Paste the contents of `domain-context.md` into the text area
6. **Option B (shows file upload feature)**: Drag `patient-journey.md` and `compliance-and-security.md` into the file upload zone

   > _"The platform understands the business. It knows about our patient personas, HIPAA constraints, Epic EHR integration, and business rules like the 2-hour cancellation window. Instead of writing all this in the requirements prompt, we capture it once in the domain context and it shapes every output downstream."_

---

## Step 2 — Configure Tech Context (~45 sec)

1. Click the **Tech Context** section
2. Paste the contents of `technical-context.md` into the text area (or upload the file)

   > _"Now we tell the platform about our technical architecture — the Auth Service, Appointment Service, FHIR Adapter, the event bus, Cognito for auth. When we generate stories later, the acceptance criteria will reference the right services by name rather than giving us generic instructions."_

---

## Step 3 — Requirements Intake (~1 min)

1. Navigate to the **Requirements Intake** screen (main view)
2. Copy the requirements text from `requirements-prompt.md` (the block inside the code fence)
3. Paste it into the requirements text area

   > _"This is a realistic product brief — appointment booking, medical records, repeat prescriptions, secure messaging, carer proxy access. Typical output from a BA or product discovery workshop. About 400 words — real-world length."_

4. Click **Analyse / Start**

---

## Step 4 — Clarifying Questions (~1.5 min)

The AI generates **3–5 clarifying questions** (Balanced mode).

   > _"Before generating anything, it asks the questions a senior BA would ask. Primary users, compliance constraints, integration landscape, offline support, release phasing."_

Walk through 2–3 questions and select or type answers:

- **Primary users**: "Registered patients (420k), carers with proxy access, and front-desk admin"
- **Compliance**: "HIPAA primary, GDPR for EU patients, WCAG 2.1 AA mandatory"
- **Phase / timeline**: "Phase 1 MVP in 6 months covering booking, records, messaging; Phase 2 adds payments and wearables"

Click **Continue** after answering.

**Show slider effect** (optional 20-sec detour):
- Drag the assistance slider to **Streamlined** → "In a hurry? Skip questions entirely, go straight to epics"
- Drag back to **Thorough** → "Or get up to 8 questions for a brand new domain you've never built before"
- Reset to **Balanced** and proceed

---

## Step 5 — Epics (~1.5 min)

The AI generates **5–7 epics** based on requirements + context + Q&A answers.

   > _"In about 2 seconds it's produced the epic structure a BA would spend a sprint on. Appointment Management, Medical Records Access, Secure Messaging, Prescription Management, Carer Proxy Access, Account & Identity. The domain context is already shaping this — you can see it knows these are patient-facing epics with compliance implications."_

Point out:
- Epic categories map to the domain personas (patient, carer, admin)
- Priority labels reflect the Phase 1 / Phase 2 phasing from the Q&A
- Click any epic to expand → shows description + tags

Click **Generate Stories** on the **Appointment Management** epic.

---

## Step 6 — Story Breakdown (~2 min)

Stories are generated for the selected epic.

   > _"Now look at the acceptance criteria on these stories. 'The Appointment Service checks the patient has fewer than 3 future bookings for the same clinic.' 'FHIR write-back to Epic sets the appointment status to no-show when cancelled within 2 hours.' The technical context is working — it knows the service names, the business rules, and the integration protocol."_

Walk through 2–3 stories:

1. **Book a GP Appointment** — point out the Appointment Service reference, the 3-booking business rule, the FHIR R4 write-back
2. **Receive appointment reminders** — point out Twilio / SendGrid in the criteria, the 24h + 2h cadence from the domain context
3. Click **Generate Stories** on **Carer Proxy Access** epic to show cross-epic consistency

**Show story editing**:
- Click the **pencil** icon on any story → edit the title inline
- Click **Split Story** → AI generates 2 sub-stories → total count updates immediately

---

## Step 7 — INVEST Validation (~45 sec)

Click the **Validate** tab on any story.

   > _"The AI checks each story against INVEST principles — Independent, Negotiable, Valuable, Estimable, Small, Testable. It gives a pass/fail with specific suggestions."_

- Show a story that has a suggestion (e.g., "Too large — consider splitting telehealth waiting room from session management")
- Click **Fix with AI** → AI proposes a revised story text
- Accept the fix → story updates

   > _"In live mode this calls your LLM. In demo mode it's showing you the workflow with canned responses — the interaction model is identical."_

---

## Step 8 — Export (~30 sec)

Click **Export** (top right or epic overflow menu).

- Export as **CSV** → opens in Excel/Sheets as a story backlog
- Export as **JIRA** JSON → ready to import into a JIRA project

   > _"One click to go from requirements conversation to a groomed backlog. The stories land in JIRA with epics, priorities, acceptance criteria, and tags already set."_

---

## Key Talking Points

| Point | Evidence in demo |
|-------|----------------|
| Context awareness | Business rules from domain-context appear verbatim in AC (3-booking limit, 2-hour cancellation) |
| Tech precision | Service names (Auth Service, FHIR Adapter, EventBridge) appear in story AC |
| Compliance baked in | HIPAA audit logging, WCAG references appear in relevant stories without prompting |
| Adaptable assistance | Slider changes question depth; Streamlined skips to epics; Thorough goes deep |
| Works without an API key | Demo mode shows the full workflow; swap in your Anthropic/OpenAI key for live generation |
| BA force-multiplier | 8-minute demo covers what a BA team would spend 2–3 sprint ceremonies producing |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No questions generated | Refresh and ensure text is pasted before clicking Start |
| Stories look generic | Paste both domain and tech context before generating epics |
| Slider has no effect | Slider only affects question count; demo generates from a fixed pool; set it before starting |
| Export button greyed out | At least one epic with stories must exist |
