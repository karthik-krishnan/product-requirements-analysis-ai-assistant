import type { Epic, ClarifyingQuestion, INVESTValidation, Story } from '../types'

export const MOCK_CLARIFYING_QUESTIONS: ClarifyingQuestion[] = [
  {
    id: 'q1',
    question: 'Who are the primary users of this system — internal staff, external customers, or both? This will shape the authentication and permission model.',
    options: [
      'Internal staff only',
      'External customers only',
      'Both internal and external users',
      'B2B partners / enterprise clients',
    ],
  },
  {
    id: 'q2',
    question: 'Are there any regulatory or compliance requirements (e.g., GDPR, HIPAA, SOC 2) that need to be considered for data storage and audit trails?',
    options: [
      'GDPR (EU data privacy)',
      'HIPAA (healthcare data)',
      'SOC 2 Type II',
      'No specific compliance required',
    ],
  },
  {
    id: 'q3',
    question: 'What is the expected scale at launch — number of concurrent users and data volume? This affects infrastructure choices and performance targets.',
    options: [
      'Small (< 100 concurrent users)',
      'Medium (100–1,000 concurrent users)',
      'Large (1,000–10,000 concurrent users)',
      'Enterprise (10,000+ concurrent users)',
    ],
  },
]

export const MOCK_EPIC_QUESTIONS: ClarifyingQuestion[] = [
  {
    id: 'eq1',
    question: 'Should this epic support offline or low-connectivity scenarios, or can we assume reliable internet access?',
    options: [
      'Full offline support required',
      'Graceful degradation (read-only offline)',
      'Online-only is acceptable',
      'Needs further discussion with stakeholders',
    ],
  },
  {
    id: 'eq2',
    question: 'Are there existing UI patterns or a design system this epic should conform to, or is there design freedom?',
    options: [
      'Must follow existing design system strictly',
      'Loosely inspired by existing patterns',
      'Full design freedom (greenfield)',
      'Will be defined by UX team separately',
    ],
  },
  {
    id: 'eq3',
    question: 'What are the key non-functional requirements for this epic — specifically around response time and availability SLA?',
    options: [
      'Sub-second response, 99.9% SLA',
      '< 3 seconds acceptable, 99.5% SLA',
      'Best effort, no strict SLA yet',
      'To be defined with architecture team',
    ],
  },
]

export const MOCK_EPICS: Epic[] = [
  {
    id: 'epic-1',
    title: 'User Authentication & Identity Management',
    description: 'End-to-end identity lifecycle covering registration, login, SSO, MFA, and role-based access control for all user personas.',
    priority: 'High',
    category: 'Security & Access',
    tags: ['auth', 'security', 'identity', 'rbac'],
    stories: [],
  },
  {
    id: 'epic-2',
    title: 'Product Catalog & Search',
    description: 'Browsable, filterable product catalog with full-text search, faceted filters, and AI-assisted recommendations powered by the existing recommendation service.',
    priority: 'High',
    category: 'Core Product',
    tags: ['catalog', 'search', 'recommendations'],
    stories: [],
  },
  {
    id: 'epic-3',
    title: 'Shopping Cart & Checkout',
    description: 'Persistent cart experience across sessions and devices, streamlined checkout with saved addresses, multiple payment methods, and order confirmation.',
    priority: 'High',
    category: 'Commerce',
    tags: ['cart', 'checkout', 'payments', 'orders'],
    stories: [],
  },
  {
    id: 'epic-4',
    title: 'Order Management & Fulfillment',
    description: 'Post-purchase order lifecycle: confirmation, fulfillment tracking, returns & refunds, and integration with the existing WMS and logistics APIs.',
    priority: 'Medium',
    category: 'Operations',
    tags: ['orders', 'fulfillment', 'returns', 'wms'],
    stories: [],
  },
  {
    id: 'epic-5',
    title: 'Customer Account & Profile',
    description: 'Self-service account portal covering profile management, order history, wishlists, saved payment methods, and communication preferences.',
    priority: 'Medium',
    category: 'Customer Experience',
    tags: ['profile', 'account', 'history', 'preferences'],
    stories: [],
  },
  {
    id: 'epic-6',
    title: 'Notifications & Alerts',
    description: 'Multi-channel notification system (email, SMS, push) for order updates, promotions, and transactional events, with user-controlled preferences.',
    priority: 'Low',
    category: 'Engagement',
    tags: ['notifications', 'email', 'sms', 'push'],
    stories: [],
  },
]

export const MOCK_STORIES = {
  'epic-2': [
    {
      id: 'story-1',
      epicId: 'epic-2',
      title: 'Full-text product search with auto-suggest',
      asA: 'shopper',
      iWantTo: 'search for products using natural language keywords with real-time suggestions as I type',
      soThat: 'I can quickly find what I need without having to browse through categories',
      acceptanceCriteria: [
        'Search results appear within 300ms of each keystroke',
        'Auto-suggest dropdown shows top 5 results with product thumbnail and price',
        'Results are ranked by relevance score with fallback to popularity',
        'Zero-results page offers alternative suggestions or category links',
        'Search query is preserved in URL for shareability',
      ],
      inScope: [
        'Full-text search across product title, description, and tags',
        'Auto-suggest with debounce (250ms)',
        'Keyboard navigation in suggestions dropdown',
        'Search analytics event firing',
      ],
      outOfScope: [
        'Voice search',
        'Image-based search',
        'Search history personalisation (Phase 2)',
      ],
      assumptions: [
        'Elasticsearch cluster is provisioned and populated by the catalog ingestion pipeline',
        'Product data is fully indexed within 5 minutes of catalog update',
      ],
      crossFunctionalNeeds: [
        'Analytics: search query + click-through events to data lake',
        'Infrastructure: Elasticsearch cluster sizing for P95 < 300ms',
        'UX: Loading skeleton and empty-state designs',
      ],
      priority: 'High',
      storyPoints: 8,
    },
  ],
}

export const MOCK_STORY_LIST: Story[] = [
  {
    id: 'story-s1',
    epicId: 'epic-2',
    title: 'Full-text product search with auto-suggest',
    asA: 'shopper',
    iWantTo: 'search for products using natural language keywords with real-time suggestions as I type',
    soThat: 'I can quickly find what I need without having to browse through categories',
    acceptanceCriteria: [
      'Results appear within 300ms of each keystroke',
      'Auto-suggest shows top 5 results with thumbnail and price',
      'Results ranked by relevance with popularity fallback',
      'Zero-results page shows alternatives',
      'Search query preserved in URL',
    ],
    inScope: ['Full-text search across title, description, tags', 'Auto-suggest with debounce 250ms', 'Keyboard nav in dropdown'],
    outOfScope: ['Voice search', 'Image-based search', 'Search history (Phase 2)'],
    assumptions: ['Elasticsearch is provisioned and indexed', 'Product data indexed within 5 minutes of update'],
    crossFunctionalNeeds: ['Analytics: search + click events', 'Infra: Elasticsearch sizing', 'UX: empty-state designs'],
    priority: 'High',
    storyPoints: 8,
  },
  {
    id: 'story-s2',
    epicId: 'epic-2',
    title: 'Faceted filter panel for search results',
    asA: 'shopper',
    iWantTo: 'filter search results by category, price range, brand, and rating',
    soThat: 'I can narrow down to exactly the product I want without scrolling through irrelevant results',
    acceptanceCriteria: [
      'Filter panel visible on results page (desktop sidebar, mobile drawer)',
      'Filters update results without full page reload',
      'Active filters shown as removable chips',
      'Clear all filters button resets to unfiltered state',
      'URL reflects active filter state for shareability',
    ],
    inScope: ['Category, price range, brand, rating filters', 'Multi-select for brand and category', 'URL state management'],
    outOfScope: ['Saved filter presets (Phase 2)', 'AI-suggested filters'],
    assumptions: ['Elasticsearch aggregations support all filter types', 'Filter values come from catalog metadata'],
    crossFunctionalNeeds: ['Analytics: filter usage events', 'UX: filter panel designs for mobile and desktop'],
    priority: 'High',
    storyPoints: 5,
  },
  {
    id: 'story-s3',
    epicId: 'epic-2',
    title: 'AI-powered product recommendations',
    asA: 'shopper',
    iWantTo: 'see personalised product recommendations on the search results page and product detail page',
    soThat: 'I can discover relevant products I might not have thought to search for',
    acceptanceCriteria: [
      'Recommendations carousel visible below search results',
      'Recommendations powered by existing Recommendation Service API',
      'Carousel shows up to 8 products with name, image, price',
      'Graceful fallback to trending products if personalisation unavailable',
      'Recommendations load asynchronously (no blocking)',
    ],
    inScope: ['Integration with Recommendation Service v2 API', 'Async carousel loading', 'Trending fallback'],
    outOfScope: ['Custom ML model training', 'Real-time behavioural tracking (handled by existing service)'],
    assumptions: ['Recommendation Service is stable and meets SLA', 'Auth token passed for personalisation if user is logged in'],
    crossFunctionalNeeds: ['Platform: Recommendation Service SLA guarantee', 'Analytics: recommendation click-through events'],
    priority: 'Medium',
    storyPoints: 3,
  },
]

export const MOCK_INVEST_VALIDATION: INVESTValidation = {
  independent: {
    adheres: true,
    score: 90,
    feedback: 'This story can be developed and deployed independently of other search stories.',
    suggestions: [],
  },
  negotiable: {
    adheres: true,
    score: 85,
    feedback: 'The auto-suggest threshold (5 results) and debounce value are appropriately flexible for discussion.',
    suggestions: ['Consider making the debounce duration a configurable parameter'],
  },
  valuable: {
    adheres: true,
    score: 95,
    feedback: 'Directly improves discoverability and conversion rate — clear business value.',
    suggestions: [],
  },
  estimable: {
    adheres: true,
    score: 80,
    feedback: 'Well-defined acceptance criteria allow reasonable estimation.',
    suggestions: ['Add a spike if the team is unfamiliar with Elasticsearch query DSL'],
  },
  small: {
    adheres: false,
    score: 55,
    feedback: 'The story combines search and auto-suggest, which could be two separate deliverables.',
    suggestions: [
      'Split into: (1) Basic keyword search with results page, (2) Auto-suggest dropdown overlay',
      'Each split would be independently deployable behind a feature flag',
    ],
  },
  testable: {
    adheres: true,
    score: 90,
    feedback: 'All acceptance criteria are measurable and can be verified by automated tests.',
    suggestions: ['Add explicit performance test criterion for P95 latency in CI'],
  },
}
