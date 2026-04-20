import { useState } from 'react'
import { X, Eye, EyeOff, Zap, Cloud, BrainCircuit, Monitor, Cpu } from 'lucide-react'
import type { APISettings, AssistanceLevel, AIProvider } from '../types'
import { ASSISTANCE_LEVELS } from '../utils/assistanceLevels'

interface Props {
  settings: APISettings
  onSave: (s: APISettings) => void
  onClose: () => void
}

const PROVIDERS: { id: AIProvider; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'anthropic',    label: 'Anthropic',    sub: 'Claude Sonnet / Opus',       icon: Zap },
  { id: 'openai',       label: 'OpenAI',       sub: 'GPT-4o / GPT-4',             icon: BrainCircuit },
  { id: 'azure-openai', label: 'Azure OpenAI', sub: 'GPT-4o on Azure',            icon: Cloud },
  { id: 'google',       label: 'Google',       sub: 'Gemini 1.5 Pro / Flash',     icon: Cpu },
  { id: 'ollama',       label: 'Ollama',       sub: 'Local LLM — no key needed',  icon: Monitor },
]

export default function Settings({ settings, onSave, onClose }: Props) {
  const [local, setLocal] = useState<APISettings>(settings)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showAzureKey, setShowAzureKey] = useState(false)

  const update = (patch: Partial<APISettings>) => setLocal(prev => ({ ...prev, ...patch }))

  const handleSave = () => { onSave(local); onClose() }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Provider */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">LLM Provider</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDERS.map(({ id, label, sub, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => update({ provider: id })}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                    local.provider === id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
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

          {/* Anthropic */}
          {local.provider === 'anthropic' && (
            <div className="animate-fade-in-up space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Anthropic Credentials</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showAnthropicKey ? 'text' : 'password'}
                    className="input-field pr-9 text-sm"
                    placeholder="sk-ant-api03-…"
                    value={local.anthropicKey}
                    onChange={e => update({ anthropicKey: e.target.value })}
                  />
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
                  <input
                    type={showOpenAIKey ? 'text' : 'password'}
                    className="input-field pr-9 text-sm"
                    placeholder="sk-…"
                    value={local.openaiKey}
                    onChange={e => update({ openaiKey: e.target.value })}
                  />
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
                  <input
                    type={showAzureKey ? 'text' : 'password'}
                    className="input-field pr-9 text-sm"
                    placeholder="Your Azure OpenAI key"
                    value={local.azureKey}
                    onChange={e => update({ azureKey: e.target.value })}
                  />
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
                <div className="relative">
                  <input
                    type="password"
                    className="input-field pr-9 text-sm"
                    placeholder="AIza…"
                    value={local.googleKey}
                    onChange={e => update({ googleKey: e.target.value })}
                  />
                </div>
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

            {/* Track */}
            <div className="relative mb-5">
              <div className="absolute top-3.5 left-0 right-0 h-1 bg-gray-100 rounded-full" />
              <div
                className="absolute top-3.5 left-0 h-1 rounded-full transition-all duration-300"
                style={{
                  width: `${(local.assistanceLevel / 4) * 100}%`,
                  backgroundColor: ['#9ca3af','#34d399','#6272f5','#fbbf24','#8b5cf6'][local.assistanceLevel],
                }}
              />
              <div className="relative flex justify-between">
                {ASSISTANCE_LEVELS.map(level => {
                  const isSelected = local.assistanceLevel === level.id
                  const isPast = local.assistanceLevel >= level.id
                  return (
                    <button
                      key={level.id}
                      onClick={() => update({ assistanceLevel: level.id as AssistanceLevel })}
                      className="flex flex-col items-center gap-1.5 group"
                      style={{ width: '20%' }}
                    >
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
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} className="btn-primary text-sm">Save Settings</button>
        </div>
      </div>
    </div>
  )
}
