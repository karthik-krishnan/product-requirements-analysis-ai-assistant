# Pinnacle Properties Group — Agent Experience Team: Domain Context

## Team Scope

The Agent Experience Team owns the **agent-facing portal** — everything an agent interacts with from the moment they apply to Pinnacle through to day-to-day transaction activity. This covers the recruiting pipeline, agent onboarding, license and E&O tracking, commission plan assignment, cap progress, performance dashboard, and showing/listing management tools.

---

## Team Personas

| Persona | Description | Key Needs |
|---|---|---|
| **Prospective Agent (Recruit)** | Applying to join Pinnacle | Application status, required documents, next steps |
| **New Agent (Onboarding)** | Recently joined; completing onboarding steps | Checklist progress, missing items, E&O enrollment, MLS setup |
| **Active Agent** | Fully licensed and transacting | My transactions, cap progress, commission estimate, E&O expiry, performance YTD |
| **Listing Specialist** | Represents sellers; manages MLS listings | Listing creation from DealDesk, showing schedule, offer tracking |
| **Recruiting Admin** | Manages the recruiting pipeline | Application queue, license verification, onboarding task assignment, source attribution |
| **Branch Manager** | Manages a regional office | Agent production dashboard, onboarding exceptions, E&O alerts, recruiting pipeline view |

---

## Recruiting Pipeline

- Prospects are tracked from first contact through: Application → Pre-License → License Pending → Onboarding → Active
- Each prospect record captures: source (referral, event, web lead, cold outreach), recruiter ownership, and stage history
- **License Pending**: agent has passed the state exam but the license has not yet been issued; they cannot transact but can begin pre-onboarding steps
- Recruiting Admin manages the pipeline; Branch Manager has a read-only funnel view with conversion rates and average days-in-stage

---

## Agent Onboarding

When an agent moves to **Onboarding** status, a mandatory checklist is created. Onboarding is fully blocked until all required steps are completed.

**Onboarding checklist (required steps):**
1. E&O insurance enrollment — policy document uploaded; expiry date recorded
2. MLS association setup — NAR membership confirmed; NTREIS, HAR, or Stellar MLS access provisioned
3. DocuSign identity verification — agent e-signs the Independent Contractor Agreement
4. Commission plan selection — agent selects one of the four plan types; Finance confirms plan parameters
5. Direct deposit setup — agent connects bank account via Stripe Connect (for commission disbursements)
6. State license upload — TREC or FREC license document uploaded; license number and expiry date recorded

Each step can be completed by the agent self-service or marked complete by a Recruiting Admin. Agents cannot create transactions until all six steps are checked off.

---

## License & E&O Tracking

| Record Type | Fields Tracked | Alert Schedule |
|---|---|---|
| **State License** | License number, issue date, expiry date, renewal status, license type | 30-day, 14-day, 7-day, day-of alerts |
| **E&O Insurance** | Policy number, carrier, certificate upload, expiry date | 30-day, 14-day, 7-day, day-of alerts |

- **E&O expiry = hard block**: on the day the E&O record expires, the agent is automatically moved to **E&O Expired** status and cannot create new transactions. Existing open transactions are unaffected.
- **License expiry**: agent automatically moved to **License Expired** status; both new transactions and existing transactions are blocked pending resolution.
- Alerts sent via email and in-portal notification; escalating urgency as expiry approaches

---

## Commission Plan Management

- Each agent is assigned one of four plan types at onboarding (Standard Split, Cap Model, Graduated Split, Team Model)
- Plan parameters (split percentages, cap amount, tier thresholds) are configured by Finance in the Admin console
- **Plan changes**: effective at the agent's next anniversary date; the agent can see their current plan and any pending plan change
- **Cap progress (Cap Model agents)**: year-to-date brokerage-side commission paid, displayed as a dollar amount and percentage bar; remaining cap amount; projected cap date (based on trailing 90-day velocity)
- **Cap reset**: on the agent's anniversary date, the YTD cap accumulator resets to zero; the agent is notified

---

## Agent Performance Dashboard

Each agent sees their own YTD dashboard:

| Metric | Description |
|---|---|
| **GCI YTD** | Gross commission income earned year-to-date |
| **Unit count** | Number of closed transactions YTD |
| **Active transactions** | Open transactions (all statuses before Closed) |
| **Cap progress** | For cap-model agents: YTD brokerage-side paid, cap remaining, projected cap date |
| **Commission on pending** | Estimated commission on all transactions not yet closed (based on pending close dates and agreed GCI) |
| **E&O / License status** | Expiry dates with color-coded status (green/amber/red) |

Branch Managers and Finance see a broader dashboard with all agents in their office, GCI and unit leaderboards, and cap progress for all cap-model agents.

---

## Showing & Listing Management (Listing Specialists)

- **Showing schedule**: Listing Specialists can view all scheduled showings for their listings, sourced from Calendly (embedded Phase 1)
- **MLS listing linkage**: transactions for listing representation can be linked to the corresponding MLS listing ID (NTREIS, HAR, or Stellar MLS)
- **MLS status sync**: when MLS listing status changes (e.g., Active → Pending), the linked transaction milestone is automatically updated
- **Listing creation from DealDesk (Phase 2)**: agent initiates a new MLS listing from within DealDesk, pre-populated with property data; pushed to MLS via RESO API write-back

---

## Business Rules Specific to Agent Experience

1. An agent's **onboarding checklist must be 100% complete** before the agent can create or join any transaction in DealDesk
2. E&O expiry is checked **nightly** by an automated Lambda; block is applied the morning of the expiry date (not retroactively)
3. Commission plan changes take effect on the agent's **anniversary date**; if an anniversary falls mid-transaction, the original plan applies to that transaction
4. Cap progress is displayed as **net of refunds** — if a commission is refunded due to a cancelled transaction, the cap accumulator is adjusted
5. Agents on the **Team Model** see both their own split and the Team Lead's override percentage in their commission preview; they cannot see other team members' splits
