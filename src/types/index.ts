export type AIProvider = 'anthropic' | 'azure-openai'

export interface APISettings {
  provider: AIProvider
  anthropicKey: string
  azureEndpoint: string
  azureKey: string
  azureDeployment: string
  clarifyingQuestionsCount: number
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
  | 'validation'
  | 'story-display'

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
}
