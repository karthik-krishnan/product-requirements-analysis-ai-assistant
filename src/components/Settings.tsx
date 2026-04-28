import { useState, useRef, useCallback } from 'react'
import {
  X, Eye, EyeOff, Zap, Cloud, BrainCircuit, Monitor, Cpu, CheckCircle, AlertCircle,
  Loader2, FlaskConical, Building2, BookOpen, Upload, FileText, AlertTriangle,
} from 'lucide-react'
import type { APISettings, AssistanceLevel, AIProvider, EnterpriseConfig, UploadedFile } from '../types'
import { ASSISTANCE_LEVELS } from '../utils/assistanceLevels'
import { callLLM, hasValidKey, isLiveMode, parseJSON } from '../services/llm/client'
import { readFileContent, supportsNativePDF } from '../utils/files'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  settings: APISettings
  enterpriseConfig: EnterpriseConfig | null
  initialTab?: 'ai' | 'enterprise'
  onSave: (s: APISettings, enterprise: EnterpriseConfig) => void
  onClose: () => void
}

// ─── Provider list ────────────────────────────────────────────────────────────

const PROVIDERS: { id: AIProvider; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'anthropic',    label: 'Anthropic',    sub: 'Claude Sonnet / Opus',        icon: Zap },
  { id: 'openai',       label: 'OpenAI',       sub: 'GPT-4o / GPT-4',             icon: BrainCircuit },
  { id: 'azure-openai', label: 'Azure OpenAI', sub: 'GPT-4o on Azure',            icon: Cloud },
  { id: 'google',       label: 'Google',       sub: 'Gemini 1.5 Pro / Flash',     icon: Cpu },
  { id: 'ollama',       label: 'Ollama',       sub: 'Local LLM — no key needed',  icon: Monitor },
  { id: 'demo',         label: 'Demo',         sub: 'Sample data — no key needed', icon: FlaskConical },
]

// ─── File chip ────────────────────────────────────────────────────────────────

function FileChip({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  const isUnsupported = file.contentType === 'unsupported'
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs border ${
      isUnsupported ? 'bg-red-50 border-red-200' : 'bg-brand-50 border-brand-200'
    }`}>
      {file.loading
        ? <Loader2 className="w-3 h-3 text-brand-400 animate-spin shrink-0" />
        : isUnsupported
          ? <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
          : <FileText className="w-3 h-3 text-brand-500 shrink-0" />}
      <span className={`font-medium truncate max-w-[130px] ${isUnsupported ? 'text-red-600' : 'text-brand-700'}`}>{file.name}</span>
      {!file.loading && (
        <span className={isUnsupported ? 'text-red-400' : 'text-brand-400'}>
          {isUnsupported ? 'unsupported' : `${(file.size / 1024).toFixed(0)} KB`}
        </span>
      )}
      <button onClick={onRemove} className={`ml-1 ${isUnsupported ? 'text-red-300 hover:text-red-500' : 'text-brand-300 hover:text-brand-600'}`}>
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Small context field (text + file attach) ─────────────────────────────────

function ContextField({
  label, icon, accentColor, value, onChange, files, onFilesChange, placeholder, nativePDF,
}: {
  label: string; icon: React.ReactNode; accentColor: string
  value: string; onChange: (v: string) => void
  files: UploadedFile[]; onFilesChange: (f: UploadedFile[]) => void
  placeholder: string; nativePDF: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const processFiles = useCallback(async (rawFiles: File[]) => {
    const placeholders: UploadedFile[] = rawFiles.map(f => ({
      id: Math.random().toString(36).slice(2), name: f.name, size: f.size, type: f.type, loading: true,
    }))
    onFilesChange([...files, ...placeholders])
    const resolved = await Promise.all(rawFiles.map(async (f, i) => {
      const { content, contentType } = await readFileContent(f)
      const eff = contentType === 'pdf' && !nativePDF ? 'unsupported' : contentType
      return { ...placeholders[i], content, contentType: eff, loading: false } as UploadedFile
    }))
    onFilesChange([...files, ...resolved])
  }, [files, onFilesChange, nativePDF])

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-5 h-5 rounded flex items-center justify-center ${accentColor}`}>{icon}</div>
        <label className="text-xs font-semibold text-gray-700">{label}</label>
      </div>
      <textarea
        className="textarea-field text-xs"
        rows={6}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {/* Drop zone */}
      <div
        className={`mt-2 border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer transition-colors ${
          dragging ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
        }`}
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(Array.from(e.dataTransfer.files)) }}
      >
        <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1.5" />
        <p className="text-xs font-semibold text-gray-500">Drag &amp; drop or click to upload</p>
        <p className="text-xs text-gray-400 mt-0.5">
          TXT, MD — up to 20 MB each · PDF requires Anthropic or Gemini
        </p>
        <input ref={ref} type="file" multiple accept=".pdf,.txt,.md" className="hidden"
          onChange={e => { processFiles(Array.from(e.target.files || [])); e.target.value = '' }} />
      </div>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {files.map(f => (
            <FileChip key={f.id} file={f} onRemove={() => onFilesChange(files.filter(x => x.id !== f.id))} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Settings modal ───────────────────────────────────────────────────────────

export default function Settings({ settings, enterpriseConfig, initialTab = 'ai', onSave, onClose }: Props) {
  const [tab, setTab]   = useState<'ai' | 'enterprise'>(initialTab)
  const [local, setLocal] = useState<APISettings>(settings)
  const [entDraft, setEntDraft] = useState<EnterpriseConfig>(
    enterpriseConfig ?? { name: '', domainText: '', domainFiles: [], techText: '', techFiles: [] }
  )
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenAIKey,    setShowOpenAIKey]    = useState(false)
  const [showAzureKey,     setShowAzureKey]     = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const nativePDF = supportsNativePDF(local.provider)

  const update = (patch: Partial<APISettings>) => { setLocal(prev => ({ ...prev, ...patch })); setTestStatus('idle') }
  const handleSave = () => { onSave(local, entDraft); onClose() }

  const handleTest = async () => {
    setTestStatus('loading')
    setTestMessage('')
    try {
      const raw = await callLLM([
        { role: 'user', content: 'Reply with this exact JSON and nothing else: {"ok": true, "message": "Connection successful"}' },
      ], local)
      const data = parseJSON<{ ok: boolean; message: string }>(raw)
      if (data.ok) { setTestStatus('ok'); setTestMessage(data.message ?? 'Connection successful') }
      else         { setTestStatus('error'); setTestMessage('Unexpected response from model') }
    } catch (err) {
      setTestStatus('error')
      setTestMessage((err as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-1">
          {([
            { id: 'ai',         label: 'AI & Assistance', icon: Zap },
            { id: 'enterprise', label: 'Enterprise Context', icon: Building2 },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── AI & Assistance tab ── */}
          {tab === 'ai' && (<>
            {/* Provider */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">LLM Provider</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROVIDERS.map(({ id, label, sub, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => update({ provider: id })}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      local.provider === id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      local.provider === id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${local.provider === id ? 'text-brand-700' : 'text-gray-700'}`}>{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Demo notice */}
            {local.provider === 'demo' && (
              <div className="animate-fade-in-up">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                  Running on pre-built sample data. No API key required — explore the full workflow with an example e-commerce backlog.
                </div>
              </div>
            )}

            {/* Anthropic */}
            {local.provider === 'anthropic' && (
              <div className="animate-fade-in-up space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Anthropic Credentials</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                  <div className="relative">
                    <input type={showAnthropicKey ? 'text' : 'password'} className="input-field pr-9 text-sm" placeholder="sk-ant-api03-…"
                      value={local.anthropicKey} onChange={e => update({ anthropicKey: e.target.value })} />
                    <button onClick={() => setShowAnthropicKey(!showAnthropicKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showAnthropicKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Get your key at console.anthropic.com</p>
                </div>
              </div>
            )}

            {/* OpenAI */}
            {local.provider === 'openai' && (
              <div className="animate-fade-in-up space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">OpenAI Credentials</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                  <div className="relative">
                    <input type={showOpenAIKey ? 'text' : 'password'} className="input-field pr-9 text-sm" placeholder="sk-…"
                      value={local.openaiKey} onChange={e => update({ openaiKey: e.target.value })} />
                    <button onClick={() => setShowOpenAIKey(!showOpenAIKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showOpenAIKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                  <select className="input-field text-sm" value={local.openaiModel} onChange={e => update({ openaiModel: e.target.value })}>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-4">gpt-4</option>
                  </select>
                </div>
              </div>
            )}

            {/* Azure OpenAI */}
            {local.provider === 'azure-openai' && (
              <div className="animate-fade-in-up space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Azure OpenAI Credentials</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint URL</label>
                  <input type="text" className="input-field text-sm" placeholder="https://your-resource.openai.azure.com" value={local.azureEndpoint} onChange={e => update({ azureEndpoint: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deployment Name</label>
                  <input type="text" className="input-field text-sm" placeholder="gpt-4o" value={local.azureDeployment} onChange={e => update({ azureDeployment: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                  <div className="relative">
                    <input type={showAzureKey ? 'text' : 'password'} className="input-field pr-9 text-sm" placeholder="Your Azure OpenAI key"
                      value={local.azureKey} onChange={e => update({ azureKey: e.target.value })} />
                    <button onClick={() => setShowAzureKey(!showAzureKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showAzureKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Google */}
            {local.provider === 'google' && (
              <div className="animate-fade-in-up space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Google AI Credentials</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                  <input type="password" className="input-field text-sm" placeholder="AIza…" value={local.googleKey} onChange={e => update({ googleKey: e.target.value })} />
                  <p className="text-xs text-gray-400 mt-1">Get your key at aistudio.google.com</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                  <select className="input-field text-sm" value={local.googleModel} onChange={e => update({ googleModel: e.target.value })}>
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  </select>
                </div>
              </div>
            )}

            {/* Ollama */}
            {local.provider === 'ollama' && (
              <div className="animate-fade-in-up space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ollama — Local LLM</p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
                  No API key required. Ollama runs locally on your machine.
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ollama Endpoint</label>
                  <input type="text" className="input-field text-sm" placeholder="http://localhost:11434" value={local.ollamaEndpoint} onChange={e => update({ ollamaEndpoint: e.target.value })} />
                  <p className="text-xs text-gray-400 mt-1">Default is http://localhost:11434</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                  <input type="text" className="input-field text-sm" placeholder="e.g. llama3, mistral, gemma3" value={local.ollamaModel} onChange={e => update({ ollamaModel: e.target.value })} />
                  <p className="text-xs text-gray-400 mt-1">Must be pulled locally via <code className="bg-gray-100 px-1 rounded">ollama pull &lt;model&gt;</code></p>
                </div>
              </div>
            )}

            {/* AI Assistance Level */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Assistance Level</p>
              <p className="text-xs text-gray-400 mb-4">Match the lever to your experience — seasoned BAs want less prompting, junior BAs benefit from more.</p>
              <div className="relative mb-5">
                <div className="absolute top-3.5 left-0 right-0 h-1 bg-gray-100 rounded-full" />
                <div className="absolute top-3.5 left-0 h-1 rounded-full transition-all duration-300" style={{
                  width: `${(local.assistanceLevel / 4) * 100}%`,
                  backgroundColor: ['#9ca3af','#34d399','#6272f5','#fbbf24','#8b5cf6'][local.assistanceLevel],
                }} />
                <div className="relative flex justify-between">
                  {ASSISTANCE_LEVELS.map(level => {
                    const isSelected = local.assistanceLevel === level.id
                    const isPast = local.assistanceLevel >= level.id
                    return (
                      <button key={level.id} onClick={() => update({ assistanceLevel: level.id as AssistanceLevel })}
                        className="flex flex-col items-center gap-1.5 group" style={{ width: '20%' }}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                          isSelected ? 'border-current shadow scale-125 bg-white' : isPast ? 'border-current bg-current opacity-40' : 'border-gray-200 bg-white'
                        } ${level.color}`}>
                          {isSelected && <div className={`w-2 h-2 rounded-full ${['bg-gray-400','bg-emerald-400','bg-brand-500','bg-amber-400','bg-violet-500'][level.id]}`} />}
                        </div>
                        <p className={`text-xs font-medium leading-tight text-center ${isSelected ? level.color : 'text-gray-300'}`}>{level.name}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={`rounded-xl border px-3 py-2.5 text-xs transition-all duration-300 ${
                ['bg-gray-50 border-gray-200','bg-emerald-50 border-emerald-200','bg-brand-50 border-brand-200','bg-amber-50 border-amber-200','bg-violet-50 border-violet-200'][local.assistanceLevel]
              }`}>
                <p className={`font-semibold mb-0.5 ${ASSISTANCE_LEVELS[local.assistanceLevel].color}`}>
                  {ASSISTANCE_LEVELS[local.assistanceLevel].name}
                  {local.assistanceLevel > 0 && (
                    <span className="font-normal text-gray-400 ml-1.5">
                      · {ASSISTANCE_LEVELS[local.assistanceLevel].range[0]}
                      {ASSISTANCE_LEVELS[local.assistanceLevel].range[0] !== ASSISTANCE_LEVELS[local.assistanceLevel].range[1]
                        ? `–${ASSISTANCE_LEVELS[local.assistanceLevel].range[1]} questions`
                        : ' question'}
                    </span>
                  )}
                </p>
                <p className="text-gray-500">{ASSISTANCE_LEVELS[local.assistanceLevel].description}</p>
              </div>
            </div>
          </>)}

          {/* ── Enterprise Context tab ── */}
          {tab === 'enterprise' && (<>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">Company-wide context</p>
              <p>This context is automatically combined with each team workspace's context before every AI call. Set it once and all workspaces benefit.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Organization name</label>
              <input
                className="input-field"
                placeholder="e.g. Acme Corp, RetailCo, HealthFirst"
                value={entDraft.name}
                onChange={e => setEntDraft(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <ContextField
              label="Enterprise Domain Context"
              icon={<BookOpen className="w-3 h-3 text-emerald-600" />}
              accentColor="bg-emerald-50"
              value={entDraft.domainText}
              onChange={v => setEntDraft(p => ({ ...p, domainText: v }))}
              files={entDraft.domainFiles}
              onFilesChange={f => setEntDraft(p => ({ ...p, domainFiles: f }))}
              placeholder="Company-wide domain — business model, customer segments, key regulations, product portfolio, org structure..."
              nativePDF={nativePDF}
            />

            <ContextField
              label="Enterprise Technology Context"
              icon={<Cpu className="w-3 h-3 text-violet-600" />}
              accentColor="bg-violet-50"
              value={entDraft.techText}
              onChange={v => setEntDraft(p => ({ ...p, techText: v }))}
              files={entDraft.techFiles}
              onFilesChange={f => setEntDraft(p => ({ ...p, techFiles: f }))}
              placeholder="Company-wide tech standards — cloud provider, security policies, approved platforms, shared services, ADRs..."
              nativePDF={nativePDF}
            />
          </>)}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex flex-col gap-3">
          {testStatus !== 'idle' && tab === 'ai' && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
              testStatus === 'loading' ? 'bg-brand-50 text-brand-600 border border-brand-200' :
              testStatus === 'ok'      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                        'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5" />}
              {testStatus === 'ok'      && <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              {testStatus === 'error'   && <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              <span className="break-words min-w-0">
                {testStatus === 'loading' ? 'Sending test request…' : testMessage}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {tab === 'ai' && local.provider !== 'demo' ? (
              <button onClick={handleTest} disabled={!isLiveMode(local) || testStatus === 'loading'}
                className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-40">
                {testStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Test Connection
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSave} className="btn-primary text-sm">Save Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
