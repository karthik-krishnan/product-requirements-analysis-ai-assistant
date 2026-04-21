import { useState, useEffect } from 'react'
import { X, CheckCircle, Loader2, ExternalLink, AlertCircle } from 'lucide-react'

interface JiraItem {
  id: string
  title: string
  type: 'Epic' | 'Story'
}

interface Props {
  items: JiraItem[]
  onClose: () => void
}

type PushState = 'config' | 'pushing' | 'done'

function randomTicket(projectKey: string, base: number) {
  return `${projectKey}-${base}`
}

export default function JiraPushModal({ items, onClose }: Props) {
  const [projectKey, setProjectKey] = useState('PROJ')
  const [pushState, setPushState] = useState<PushState>('config')
  const [pushed, setPushed] = useState<number>(0)
  const [tickets, setTickets] = useState<Record<string, string>>({})

  useEffect(() => {
    if (pushState !== 'pushing') return

    let index = 0
    const base = Math.floor(Math.random() * 800) + 100

    const tick = () => {
      if (index >= items.length) {
        setPushState('done')
        return
      }
      const item = items[index]
      setTickets(prev => ({ ...prev, [item.id]: randomTicket(projectKey.toUpperCase(), base + index) }))
      setPushed(index + 1)
      index++
      setTimeout(tick, 350)
    }

    setTimeout(tick, 400)
  }, [pushState])

  const handlePush = () => {
    if (!projectKey.trim()) return
    setPushState('pushing')
    setPushed(0)
    setTickets({})
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && pushState !== 'pushing' && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M11.571 11.429 6.429 6.286A6 6 0 0 1 17.143 12l-5.572-.571zm.858.571 5.142 5.143A6 6 0 0 1 6.857 12l5.572.571z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">Push to Jira</span>
          </div>
          {pushState !== 'pushing' && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Config */}
          {pushState === 'config' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">This is a demo integration. Tickets shown are simulated and will not be created in a real Jira project.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jira Project Key</label>
                <input
                  className="input-field font-mono uppercase"
                  value={projectKey}
                  onChange={e => setProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="PROJ"
                  maxLength={10}
                />
                <p className="text-xs text-gray-400 mt-1">Tickets will be created as {projectKey || 'PROJ'}-NNN</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{items.length} item{items.length !== 1 ? 's' : ''} to push</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2.5 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${item.type === 'Epic' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.type}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pushing */}
          {pushState === 'pushing' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-4">Pushing to <span className="font-semibold text-gray-700">{projectKey}</span>…</p>
              {items.map((item, i) => {
                const ticket = tickets[item.id]
                const isPushing = i === pushed && !ticket
                return (
                  <div key={item.id} className="flex items-center gap-3 text-sm py-1.5">
                    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                      {ticket ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : isPushing ? (
                        <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border-2 border-gray-200" />
                      )}
                    </div>
                    <span className={`flex-1 truncate ${ticket ? 'text-gray-700' : 'text-gray-400'}`}>{item.title}</span>
                    {ticket && (
                      <span className="text-xs font-mono text-blue-600 shrink-0">{ticket}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Done */}
          {pushState === 'done' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
                <p className="text-sm font-semibold text-gray-900">{items.length} item{items.length !== 1 ? 's' : ''} pushed successfully</p>
                <p className="text-xs text-gray-500">Project: <span className="font-mono font-semibold">{projectKey}</span></p>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="flex-1 truncate text-gray-600">{item.title}</span>
                    <a
                      href="#"
                      onClick={e => e.preventDefault()}
                      className="flex items-center gap-1 text-xs font-mono text-blue-600 hover:text-blue-800 shrink-0"
                    >
                      {tickets[item.id]}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          {pushState === 'config' && (
            <>
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                onClick={handlePush}
                disabled={!projectKey.trim()}
                className="btn-primary flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <path d="M11.571 11.429 6.429 6.286A6 6 0 0 1 17.143 12l-5.572-.571zm.858.571 5.142 5.143A6 6 0 0 1 6.857 12l5.572.571z" />
                </svg>
                Push to Jira
              </button>
            </>
          )}
          {pushState === 'done' && (
            <button onClick={onClose} className="btn-primary">Done</button>
          )}
        </div>
      </div>
    </div>
  )
}
