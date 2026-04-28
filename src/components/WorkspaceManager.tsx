import { useState, useRef, useCallback } from 'react'
import {
  X, Layers, Plus, Trash2, Edit3, Check, BookOpen, Cpu,
  Upload, FileText, AlertTriangle, Loader2, ChevronDown, ChevronUp, Settings,
} from 'lucide-react'
import type { Workspace, UploadedFile, APISettings } from '../types'
import { makeWorkspaceId } from '../services/enterprise'
import { readFileContent, supportsNativePDF } from '../utils/files'

// ─── File chip ────────────────────────────────────────────────────────────────

function FileChip({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  const isUnsupported = file.contentType === 'unsupported'
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs border ${
      isUnsupported ? 'bg-red-50 border-red-200' : 'bg-brand-50 border-brand-200'
    }`}>
      {file.loading
        ? <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin shrink-0" />
        : isUnsupported
          ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          : <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0" />
      }
      <span className={`font-medium truncate max-w-[140px] ${isUnsupported ? 'text-red-600' : 'text-brand-700'}`}>{file.name}</span>
      {!file.loading && (
        <span className={isUnsupported ? 'text-red-400' : 'text-brand-400'}>
          {isUnsupported ? 'unsupported' : `${(file.size / 1024).toFixed(0)} KB`}
        </span>
      )}
      <button onClick={onRemove} className={`ml-1 ${isUnsupported ? 'text-red-300 hover:text-red-600' : 'text-brand-300 hover:text-brand-600'}`}>
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Context section (text + file attach) ─────────────────────────────────────

function ContextSection({
  label, icon, accentColor, textValue, onTextChange, files, onFilesChange, placeholder, nativePDF,
}: {
  label: string; icon: React.ReactNode; accentColor: string
  textValue: string; onTextChange: (v: string) => void
  files: UploadedFile[]; onFilesChange: (f: UploadedFile[]) => void
  placeholder: string; nativePDF: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
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
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${accentColor}`}>{icon}</div>
        <span className="text-xs font-semibold text-gray-700">{label}</span>
      </div>
      <textarea className="textarea-field text-xs" rows={4} placeholder={placeholder}
        value={textValue} onChange={e => onTextChange(e.target.value)} />
      {/* Drop zone */}
      <div
        className={`mt-2 border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer transition-colors ${
          dragging ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(Array.from(e.dataTransfer.files)) }}
      >
        <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1.5" />
        <p className="text-xs font-semibold text-gray-500">Drag &amp; drop or click to upload</p>
        <p className="text-xs text-gray-400 mt-0.5">
          TXT, MD — up to 20 MB each · PDF requires Anthropic or Gemini
        </p>
        <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md" className="hidden"
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

// ─── WorkspaceRow ─────────────────────────────────────────────────────────────

function WorkspaceRow({
  ws, isActive, nativePDF, onSelect, onUpdate, onDelete,
}: {
  ws: Workspace; isActive: boolean; nativePDF: boolean
  onSelect: () => void; onUpdate: (ws: Workspace) => void; onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(ws)
  const [editing, setEditing] = useState(false)

  const hasContext = draft.domainText || draft.techText || draft.domainFiles.length > 0 || draft.techFiles.length > 0
  const save = () => { onUpdate(draft); setEditing(false) }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isActive ? 'border-brand-400 bg-brand-50/30' : 'border-gray-200 bg-white'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onSelect}
          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
            isActive ? 'border-brand-500 bg-brand-500' : 'border-gray-300 hover:border-brand-400'
          }`}
        >
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>

        {editing ? (
          <input autoFocus
            className="flex-1 text-sm font-medium border-b border-brand-400 bg-transparent outline-none text-gray-800"
            value={draft.name}
            onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-gray-800">{ws.name}</span>
        )}

        {isActive && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Active</span>}
        {hasContext && !isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Has context</span>}

        <div className="flex items-center gap-1 ml-auto">
          {editing
            ? <button onClick={save} className="p-1.5 text-brand-600 hover:text-brand-700"><Check className="w-3.5 h-3.5" /></button>
            : <button onClick={() => setEditing(true)} className="p-1.5 text-gray-400 hover:text-gray-600"><Edit3 className="w-3.5 h-3.5" /></button>
          }
          <button onClick={() => setExpanded(p => !p)} className="p-1.5 text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Expandable context */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-4 bg-gray-50/50">
          <ContextSection
            label="Domain Context"
            icon={<BookOpen className="w-3.5 h-3.5 text-emerald-600" />}
            accentColor="bg-emerald-50"
            textValue={draft.domainText}
            onTextChange={v => setDraft(p => ({ ...p, domainText: v }))}
            files={draft.domainFiles}
            onFilesChange={f => setDraft(p => ({ ...p, domainFiles: f }))}
            placeholder="Team-specific domain — product area, personas, business rules, glossary..."
            nativePDF={nativePDF}
          />
          <ContextSection
            label="Technology Context"
            icon={<Cpu className="w-3.5 h-3.5 text-violet-600" />}
            accentColor="bg-violet-50"
            textValue={draft.techText}
            onTextChange={v => setDraft(p => ({ ...p, techText: v }))}
            files={draft.techFiles}
            onFilesChange={f => setDraft(p => ({ ...p, techFiles: f }))}
            placeholder="Team's tech stack — frameworks, services, APIs, architecture decisions..."
            nativePDF={nativePDF}
          />
          <div className="flex justify-end">
            <button onClick={save} className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Save workspace
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WorkspaceManager modal ───────────────────────────────────────────────────

interface Props {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  settings: APISettings
  onWorkspacesChange: (workspaces: Workspace[]) => void
  onActiveWorkspaceChange: (id: string) => void
  onOpenEnterpriseSettings: () => void
  onClose: () => void
}

export default function WorkspaceManager({
  workspaces,
  activeWorkspaceId,
  settings,
  onWorkspacesChange,
  onActiveWorkspaceChange,
  onOpenEnterpriseSettings,
  onClose,
}: Props) {
  const nativePDF = supportsNativePDF(settings.provider)

  const addWorkspace = () => {
    const ws: Workspace = {
      id: makeWorkspaceId(), name: 'New Workspace',
      domainText: '', domainFiles: [], techText: '', techFiles: [],
    }
    const updated = [...workspaces, ws]
    onWorkspacesChange(updated)
    if (!activeWorkspaceId) onActiveWorkspaceChange(ws.id)
  }

  const updateWorkspace = (ws: Workspace) => onWorkspacesChange(workspaces.map(w => w.id === ws.id ? ws : w))

  const deleteWorkspace = (id: string) => {
    const updated = workspaces.filter(w => w.id !== id)
    onWorkspacesChange(updated)
    if (activeWorkspaceId === id)
      onActiveWorkspaceChange(updated.length > 0 ? updated[0].id : '')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <Layers className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Workspaces</h2>
            <p className="text-xs text-gray-400">One workspace per team — select one before starting a session</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600">
            <div className="shrink-0 mt-0.5">💡</div>
            <div>
              Each workspace's context is combined with your company-wide context before every AI call.
              {' '}
              <button onClick={onOpenEnterpriseSettings} className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2 inline-flex items-center gap-1">
                <Settings className="w-3 h-3" />Edit company-wide context in Settings
              </button>
            </div>
          </div>

          {workspaces.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
              <Layers className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium mb-1">No workspaces yet</p>
              <p className="text-xs text-gray-300">Create your first workspace to get started</p>
            </div>
          ) : (
            workspaces.map(ws => (
              <WorkspaceRow
                key={ws.id}
                ws={ws}
                isActive={ws.id === activeWorkspaceId}
                nativePDF={nativePDF}
                onSelect={() => onActiveWorkspaceChange(ws.id)}
                onUpdate={updateWorkspace}
                onDelete={() => deleteWorkspace(ws.id)}
              />
            ))
          )}

          <button
            onClick={addWorkspace}
            className="flex items-center gap-2 justify-center px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add workspace
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Done</button>
        </div>
      </div>
    </div>
  )
}
