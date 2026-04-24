import {
  MOCK_CLARIFYING_QUESTIONS,
  MOCK_EPIC_QUESTIONS,
  MOCK_EPICS,
  MOCK_STORY_LIST,
  MOCK_INVEST_VALIDATION,
  MOCK_INVEST_FIXES,
} from '../../../data/mockData'
import type { LLMMessage } from '../shared'

// ─── Chat response helpers ────────────────────────────────────────────────────

function lastUserMessage(messages: LLMMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content
  }
  return ''
}

function epicChatResponse(question: string): string {
  const q = question.toLowerCase()

  if (/social.?login|oauth|google.?login|facebook|apple.?sign|sso|saml|federat/.test(q)) {
    return `For social login the key scope decision is which identity providers to include in the MVP. Google and Apple cover the vast majority of consumer sign-ins, so those are usually the right starting point. Facebook is declining in younger demographics and adds OAuth complexity around email-address reliability. Microsoft or GitHub make sense if this product has a B2B angle.

The trickier call is account linking: what happens when someone signs up with email first and later tries to sign in with Google using the same address? If you don't handle that explicitly it creates duplicate accounts and is painful to fix post-launch.

Also worth flagging: Apple requires a native sign-in button that matches Apple's guidelines exactly, and their privacy relay emails need to be handled on the server side. That's a non-trivial implementation detail that should be in scope here. Which providers are you leaning toward for v1?`
  }

  if (/performance|response.?time|latency|speed|fast|slow|load.?time|throughput/.test(q)) {
    return `Industry benchmarks for web applications typically target under 200ms for API responses and under 1 second for full page loads for the 95th percentile. For search specifically, users start noticing latency above 300ms.

The more important question for this epic is whether those targets are stated as explicit acceptance criteria on the relevant stories, because without a number QA can't verify them and engineering can't design to them. Vague language like "should be fast" creates scope disputes later.

It's also worth deciding upfront whether performance testing is in scope for this epic or handled separately. If load testing is deferred, make that an explicit assumption so it doesn't get forgotten. What's the expected peak concurrent user load this epic needs to be designed for?`
  }

  if (/integrat|api|third.?party|external|webhook|vendor|middleware|connect/.test(q)) {
    return `The integration boundary is one of the most important things to lock down before stories are written. The main questions are: who owns the integration contract (does your system call theirs, or do they push to you?), how are auth credentials managed and rotated, and what's the fallback when the external service is unavailable?

If this is an inbound webhook or event-driven integration, you'll also need stories for idempotency — the same event arriving twice should not create duplicate records.

I'd also flag that third-party integrations often carry hidden scope: error handling, retry logic, monitoring/alerting for failed calls, and mapping their data model to yours. Those tend to be underestimated in initial story breakdowns. Is the integration synchronous or asynchronous, and has the external party confirmed the API contract is stable?`
  }

  if (/payment|checkout|billing|invoice|subscription|pricing|refund|charge/.test(q)) {
    return `Payments are one of the highest-risk areas for scope creep because PCI-DSS compliance requirements tend to expand the surface significantly once implementation starts. The key scope question is whether you're using a payment processor that handles the card data entirely (Stripe, Adyen) or whether any card data will touch your servers — the latter triggers a much larger compliance burden.

Refunds and partial refunds are almost always underspecified at the epic level and end up as emergency scope additions. I'd recommend making the refund flow an explicit story rather than assuming it's covered. Same for failed payment retry logic and dunning for subscription products.

Which payment processor is in scope, and has the compliance posture (PCI SAQ level) been confirmed?`
  }

  if (/notification|email|push|sms|alert|remind|message|inbox/.test(q)) {
    return `Notifications have an important split that affects architecture: transactional notifications (order confirmations, password resets) and marketing or engagement notifications have different consent requirements, different unsubscribe rules, and often need to go through different infrastructure.

If both types are in scope for this epic, I'd recommend separating them into sub-epics — mixing them creates compliance risk (GDPR, CAN-SPAM) and makes it harder to give users granular control over what they receive.

Also worth stating explicitly: what happens to notifications when a user deletes their account? The right-to-erasure requirement extends to notification preferences and history. Is this epic covering just the sending infrastructure, or the full preferences management surface too?`
  }

  if (/search|filter|sort|query|find|browse|discover/.test(q)) {
    return `Search scope tends to expand quickly once users start testing. The foundational question is whether this is keyword search (simple, fast to build) or relevance-ranked search (Elasticsearch/Algolia, significantly more complex). The user expectation is usually closer to Google-quality results, so it's worth being explicit about the algorithm in the epic description.

Filtering and sorting are often bundled with search but have their own complexity — especially faceted filters that need to update counts dynamically as other filters are applied. If those are in scope, they should be separate stories.

One thing that often gets missed: what happens with zero results? An empty results state with suggestions or fallback content is usually expected but rarely specified. Is the search backed by the primary database or a separate search index?`
  }

  // default
  return `The most important call here is the scope boundary — specifically what's genuinely in this epic versus what should be a separate epic or deferred to a later phase. Mixing too many concerns into one epic makes it hard to sequence work and creates stories that block each other.

There's also a dependency worth checking: does anything in this epic rely on another epic being completed first? If so, that sequencing constraint should be explicit, otherwise sprint planning will surface it at the worst possible time.

What's the core user outcome this epic is delivering, and is there a version of it that could ship in half the scope to get early feedback?`
}

function storyChatResponse(question: string): string {
  const q = question.toLowerCase()

  if (/performance|response.?time|latency|speed|fast|slow|benchmark|threshold/.test(q)) {
    return `For search, the widely accepted industry benchmark is under 200ms for the server response at the 95th percentile under normal load. Google's research shows that users notice latency above 300ms and start abandoning above 1 second. For an e-commerce or content product, 200–500ms is a reasonable target depending on query complexity.

The more important point for this story is that "fast" without a number is not a testable acceptance criterion. The AC should state something like: "Search results return within 300ms for 95% of queries under normal load (up to X concurrent users)." That gives QA a clear pass/fail condition and gives engineering a design target.

If you don't have load data yet, it's better to state an assumption ("designed for up to 500 concurrent searches") than to leave it open, because that assumption drives infrastructure decisions. Do you have existing traffic data to baseline against?`
  }

  if (/auth|login|permission|role|access|unauthori|session|token/.test(q)) {
    return `Authentication and authorisation edge cases are some of the most commonly missed ACs. The main ones to check for this story: what happens when the user's session expires mid-flow (are they redirected to login and returned to the same state afterward, or do they lose progress)? What happens if they have the right role when they start the flow but their permissions change mid-session?

If this story involves data that's scoped to a role or organisation, there should also be an explicit AC about what a user sees if they try to access a resource they're not permitted to view — a 403 with a clear message, not a 404 that leaks information about whether the resource exists.

Are there multiple user roles that interact with this story differently, and have all their paths been covered in the ACs?`
  }

  if (/error|fail|exception|unavailab|timeout|retry|fallback|down/.test(q)) {
    return `Error handling is one of the most underspecified areas in user stories. For this story, the main gaps to check: is there an AC for what the user sees when the operation fails (network error, server error, timeout)? Is the error message actionable — does it tell the user what to do next, not just that something went wrong?

For operations that take time (form submissions, file uploads, searches), there should also be a timeout AC — how long before the system gives up and shows an error, and does it retry automatically?

If this story touches an external service, the failure mode of that service should be an explicit AC rather than left to implementation judgement. Graceful degradation is much harder to retrofit. Which failure scenarios are you most concerned about for this story?`
  }

  if (/ac|acceptance criteria|criteria|testable|measurable|specific/.test(q)) {
    return `Looking at the acceptance criteria, the ones most likely to cause QA friction are any that use relative language: "should work correctly", "displays properly", "responds quickly", "looks good". Each of those needs a specific measurable threshold to be testable.

A useful test: for each AC, ask "can QA write an automated test for this, or clearly mark it pass/fail manually?" If the answer is "it depends" or "the developer would need to judge", the criterion needs to be tightened.

It's also worth checking that the ACs cover the unhappy paths, not just the success flow. Most stories have 1–2 success ACs and zero failure ACs, which leaves the error handling behaviour undefined until QA finds it. Which ACs do you want to sharpen first?`
  }

  if (/scope|in.?scope|out.?of.?scope|bound|include|exclude|mvp/.test(q)) {
    return `The scope boundary on this story looks like it could use more precision. "In scope" and "out of scope" lists are most useful when they address the things a developer or QA engineer might reasonably assume are included.

For this story specifically, the items most likely to create ambiguity are anything that involves state persistence, error recovery, or edge cases around concurrent users. If those aren't explicitly called out either way, they'll be interpreted differently by different team members.

A good rule of thumb: anything that would take more than a day to implement that isn't explicitly in scope should either be added to the story or explicitly excluded. What's the one thing most likely to be debated during sprint planning for this story?`
  }

  // default
  return `A couple of things worth looking at in this story. First, check whether all the acceptance criteria are specific enough to be tested without interpretation — any AC that uses words like "correctly", "properly", or "as expected" needs a concrete measurable threshold instead.

Second, the out-of-scope list is most valuable when it explicitly addresses the things a developer might reasonably assume are included. If there are obvious related behaviours that aren't in this story, naming them explicitly prevents scope debates during the sprint.

Is there a specific AC or scope boundary you'd like to work through?`
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function callDemo(promptType: string | undefined, messages: LLMMessage[] = []): Promise<string> {
  await new Promise(r => setTimeout(r, 700 + Math.random() * 600))

  if (promptType === 'clarifying-questions') {
    return JSON.stringify({ questions: MOCK_CLARIFYING_QUESTIONS })
  }
  if (promptType === 'epic-clarifying-questions') {
    return JSON.stringify({ questions: MOCK_EPIC_QUESTIONS })
  }
  if (promptType === 'generate-epics') {
    return JSON.stringify({ epics: MOCK_EPICS })
  }
  if (promptType === 'generate-stories') {
    const stories = MOCK_STORY_LIST.map(({ id: _id, epicId: _epicId, ...rest }) => rest)
    return JSON.stringify({ stories })
  }
  if (promptType === 'validate-invest') {
    return JSON.stringify(MOCK_INVEST_VALIDATION)
  }
  if (promptType?.startsWith('fix-invest:')) {
    const key = promptType.split(':')[1]
    const fix = MOCK_INVEST_FIXES[key] ?? MOCK_INVEST_FIXES['independent']
    return JSON.stringify(fix)
  }
  if (promptType === 'epic-chat') {
    return epicChatResponse(lastUserMessage(messages))
  }
  if (promptType === 'story-chat') {
    return storyChatResponse(lastUserMessage(messages))
  }

  return JSON.stringify({})
}
