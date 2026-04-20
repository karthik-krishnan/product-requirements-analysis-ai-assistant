import { useState } from 'react'
import { Settings as SettingsIcon, Eye, EyeOff, ChevronRight, Zap, Cloud } from 'lucide-react'
import type { APISettings } from '../types'

interface Props {
  settings: APISettings
  onSave: (s: APISettings) => void
}

export default function Settings({ settings, onSave }: Props) {
  const [local, setLocal] = useState<APISettings>(settings)
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showAzureKey, setShowAzureKey] = useState(false)

  const update = (patch: Partial<APISettings>) => setLocal(prev => ({ ...prev, ...patch }))

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Configuration</h1>
          <p className="text-sm text-gray-500">Set your AI provider and preferences</p>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="card p-6 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">AI Provider</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'anthropic' as const, label: 'Anthropic Claude', sub: 'Claude Sonnet / Opus', icon: Zap },
            { id: 'azure-openai' as const, label: 'Azure OpenAI', sub: 'GPT-4o / GPT-4', icon: Cloud },
          ].map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              onClick={() => update({ provider: id })}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                local.provider === id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                local.provider === id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-medium ${local.provider === id ? 'text-brand-700' : 'text-gray-700'}`}>{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Anthropic Settings */}
      {local.provider === 'anthropic' && (
        <div className="card p-6 mb-5 animate-fade-in-up">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Anthropic Credentials</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showAnthropicKey ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="sk-ant-api03-..."
                value={local.anthropicKey}
                onChange={e => update({ anthropicKey: e.target.value })}
              />
              <button
                onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Find your key at <span className="text-brand-600">console.anthropic.com</span>
            </p>
          </div>
        </div>
      )}

      {/* Azure Settings */}
      {local.provider === 'azure-openai' && (
        <div className="card p-6 mb-5 animate-fade-in-up">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Azure OpenAI Credentials</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Endpoint URL</label>
              <input
                type="text"
                className="input-field"
                placeholder="https://your-resource.openai.azure.com"
                value={local.azureEndpoint}
                onChange={e => update({ azureEndpoint: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Deployment Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="gpt-4o"
                value={local.azureDeployment}
                onChange={e => update({ azureDeployment: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
              <div className="relative">
                <input
                  type={showAzureKey ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Your Azure OpenAI key"
                  value={local.azureKey}
                  onChange={e => update({ azureKey: e.target.value })}
                />
                <button
                  onClick={() => setShowAzureKey(!showAzureKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showAzureKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Behaviour Settings */}
      <div className="card p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">AI Behaviour</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Clarifying Questions per Interaction
          </label>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => update({ clarifyingQuestionsCount: n })}
                className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                  local.clarifyingQuestionsCount === n
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">How many questions the AI asks before generating epics or stories (default: 3)</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave(local)}
          className="btn-primary flex items-center gap-2"
        >
          Save & Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
