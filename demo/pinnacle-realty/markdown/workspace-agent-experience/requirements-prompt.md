# Requirements Prompt — Pinnacle Properties Group Agent Experience Team

## How to use this file

1. In ProductPilot, go to **Settings → Enterprise Context** and paste `enterprise/enterprise-domain-context.md` into the Domain Context field. Paste `enterprise/enterprise-tech-context.md` into the Tech Context field.
2. Select or create the **Agent Experience** workspace. Paste `workspace-agent-experience/domain-context.md` into its Domain Context field and `workspace-agent-experience/tech-context.md` into its Tech Context field.
3. Copy the requirements text below and paste it into the **Requirements Intake** screen.

---

## Requirements Text (paste this)

```
Build the agent-facing portal for Pinnacle Properties Group's DealDesk platform, covering the full agent
lifecycle from recruiting pipeline through active agent day-to-day operations.

Pinnacle has 3,200 active agents across Texas (TREC-licensed) and Florida (FREC-licensed). The platform
replaces Follow Up Boss (CRM), a home-grown Excel transaction tracker, and manual spreadsheet-based cap tracking.

Scope for this initiative:

1. RECRUITING PIPELINE
   - Track prospects from first contact through: Application → Pre-License → License Pending → Onboarding → Active
   - Capture source attribution (referral, event, web lead, cold outreach) and recruiter ownership
   - Kanban pipeline view for Recruiting Admins; funnel analytics (conversion rate, average days-in-stage) for Branch Managers
   - Stage transition triggers: License Pending → Onboarding requires license number and exam pass confirmation upload

2. AGENT ONBOARDING
   - Mandatory onboarding checklist with 6 required steps (all must be complete before agent can transact):
     1. E&O insurance enrollment (policy document upload; expiry date recorded)
     2. MLS association setup (NAR membership confirmed; NTREIS, HAR, or Stellar MLS access provisioned)
     3. DocuSign identity verification (Independent Contractor Agreement e-sign)
     4. Commission plan selection (agent selects plan type; Finance confirms parameters)
     5. Direct deposit setup (Stripe Connect bank account connection)
     6. State license upload (TREC or FREC license document + license number + expiry date)
   - Each step can be completed self-service by the agent or marked complete by a Recruiting Admin
   - Transaction creation is hard-blocked until all 6 steps are complete (enforced server-side, not just UI)
   - TREC license numbers verified via TREC API at upload; FREC verified manually by Recruiting Admin (no FREC API)

3. LICENSE & E&O TRACKING
   - Track state license (number, expiry, renewal status) and E&O insurance (policy number, carrier, expiry) per agent
   - Nightly check at 6 AM CT: escalating email + SMS alerts at 30, 14, 7, and 0 days before expiry
   - E&O expiry = automatic block on new transaction creation (applied at 6 AM CT on expiry date)
   - License expiry = block on both new and existing transactions
   - Branch Manager receives copy of all alerts for agents in their office

4. COMMISSION PLAN MANAGEMENT
   - Assign each agent one of four plan types: Standard Split, Cap Model, Graduated Split, Team Model
   - Plan parameters (split ratios, cap amount, tier thresholds) configured by Finance — no code deployment required
   - Plan changes effective at agent's next anniversary date; agent can see current plan and any pending change
   - Cap Model agents: display YTD cap progress (amount paid, percentage, remaining, projected cap date based on trailing 90-day velocity)
   - Cap resets automatically on agent's anniversary date

5. AGENT PERFORMANCE DASHBOARD
   - Agent self-view: GCI YTD, unit count, active transactions, cap progress (if cap model), commission on pending transactions, E&O / license status
   - Branch Manager view: all agents in office; GCI + unit leaderboard (MTD, QTD, YTD); cap progress report for all cap-model agents
   - Listing Specialist view: MLS listings linked to their transactions; showing schedule (Calendly embed); offer tracking

Platform integrations: TREC API (Texas license verification), DocuSign (Independent Contractor Agreement),
Stripe Connect (agent bank account onboarding), Follow Up Boss (read-only legacy CRM sync, Phase 1 only),
Calendly (showing schedule embed, Phase 1), MLS Sync Service (listing status updates via EventBridge),
SendGrid + Twilio (via Notification Service, E&O alerts and onboarding reminders).

Phase 1 (6 months): recruiting pipeline, onboarding checklist, license + E&O tracking, commission plan assignment, agent performance dashboard.
Phase 2 (months 7–12): cap projection engine, showing schedule (Calendly API sync to DealDesk), MLS listing creation from DealDesk (RESO write-back), Follow Up Boss deprecation.
```

---

## Suggested Answers to Clarifying Questions

| Question theme | Suggested answer |
|---|---|
| Onboarding block enforcement | Server-side in Transaction Service: checks Onboarding Service for all 6 steps = complete before allowing transaction creation; HTTP 403 with step-by-step completion status returned |
| TREC vs FREC verification | TREC: real-time API verification at upload. FREC: manual — Recruiting Admin uploads screenshot of FREC portal; system stores upload date as verification date |
| E&O block timing | Nightly Lambda at 6 AM CT; block applied on expiry date (not day before); existing open transactions unaffected by E&O expiry (only new transaction creation blocked) |
| Commission plan changes | Plan change takes effect on next anniversary date (not immediately); if agent closes a transaction before anniversary, original plan applies |
| Cap accumulator source | Commission Engine (Transaction Management team) emits `commission.brokerage_side.paid` EventBridge event; Cap Tracking Service consumes and updates YTD accumulator within 5 minutes |
| Team Model visibility | Agent sees their own split and Team Lead override; cannot see other team members' splits; Team Lead sees team-level aggregate GCI |
| Phasing | Phase 1 (6 months): recruiting, onboarding, license/E&O, plan assignment, performance dashboard; Phase 2 (months 7–12): cap projection, Calendly API, MLS write-back, FUB deprecation |
