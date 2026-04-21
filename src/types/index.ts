export type AIProvider = 'anthropic' | 'openai' | 'azure-openai' | 'google' | 'ollama'

export type AssistanceLevel = 0 | 1 | 2 | 3 | 4

export interface APISettings {
  provider: AIProvider
  anthropicKey: string
  openaiKey: string
  openaiModel: string
  azureEndpoint: string
  azureKey: string
  azureDeployment: string
  googleKey: string
  googleModel: string
  ollamaEndpoint: string
  ollamaModel: string
  assistanceLevel: AssistanceLevel
}

export interface ContextCapture {
  domainText: string
  domainFiles: UploadedFile[]
  techText: string
  techFiles: UploadedFile[]
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content?: string                       // plain text (TXT/MD) or base64 (PDF)
  contentType?: 'text' | 'pdf' | 'unsupported'
  loading?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  options?: string[]
  selectedOption?: string
}

export interface ClarifyingQuestion {
  id: string
  question: string
  options: string[]
  answer?: string
}

export interface Epic {
  id: string
  title: string
  description: string
  priority: 'High' | 'Medium' | 'Low'
  category: string
  stories?: Story[]
  tags: string[]
}

export interface Story {
  id: string
  epicId: string
  title: string
  asA: string
  iWantTo: string
  soThat: string
  acceptanceCriteria: string[]
  inScope: string[]
  outOfScope: string[]
  assumptions: string[]
  crossFunctionalNeeds: string[]
  priority: 'High' | 'Medium' | 'Low'
  storyPoints?: number
  investValidation?: INVESTValidation
}

export interface INVESTValidation {
  independent: INVESTItem
  negotiable: INVESTItem
  valuable: INVESTItem
  estimable: INVESTItem
  small: INVESTItem
  testable: INVESTItem
}

export interface FieldDiff {
  field: string
  label: string
  before: string | string[]
  after: string | string[]
}

export interface FixProposal {
  principleKey: string
  summary: string
  isSplit?: boolean
  splitStories?: { title: string; description: string }[]
  splitNewStory?: Omit<Story, 'id'>
  isSpike?: boolean
  spikeStory?: { title: string; description: string }
  spikeNewStory?: Omit<Story, 'id'>
  diffs: FieldDiff[]
  patch: Partial<Story>
}

export interface INVESTItem {
  adheres: boolean
  score: number
  feedback: string
  suggestions: string[]
}

export type AppStep =
  | 'settings'
  | 'context'
  | 'requirements'
  | 'epics'
  | 'stories'

export interface AppState {
  currentStep: AppStep
  settings: APISettings
  context: ContextCapture
  rawRequirements: string
  clarifyingQuestions: ClarifyingQuestion[]
  clarifyingComplete: boolean
  epics: Epic[]
  selectedEpicId: string | null
  selectedStoryId: string | null
  storyValidations: Record<string, INVESTValidation>
  storyAcceptedFixes: Record<string, string[]>
}
