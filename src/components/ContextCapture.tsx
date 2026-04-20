import { useState, useRef } from 'react'
import { BookOpen, Cpu, Upload, FileText, X, ChevronRight, Clipboard, CheckCheck } from 'lucide-react'
import type { ContextCapture as ContextCaptureType, UploadedFile } from '../types'

interface Props {
  context: ContextCaptureType
  onSave: (c: ContextCaptureType) => void
}

function FileChip({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5 text-xs">
      <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0" />
      <span className="text-brand-700 font-medium truncate max-w-[160px]">{file.name}</span>
      <span className="text-brand-400">{(file.size / 1024).toFixed(0)} KB</span>
      <button onClick={onRemove} className="text-brand-300 hover:text-brand-600 ml-1">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

interface PanelProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  textValue: string
  onTextChange: (v: string) => void
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  placeholder: string
  accentColor: string
}

function ContextPanel({
  icon, title, subtitle, textValue, onTextChange, files, onFilesChange, placeholder, accentColor
}: PanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const newFiles: UploadedFile[] = selected.map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      type: f.type,
    }))
    onFilesChange([...files, ...newFiles])
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    const newFiles: UploadedFile[] = dropped.map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      type: f.type,
    }))
    onFilesChange([...files, ...newFiles])
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      onTextChange(textValue + (textValue ? '\n\n' : '') + text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available in some environments
    }
  }

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Rich Text Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-600">Paste or type context</label>
          <button
            onClick={handlePaste}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
            {copied ? 'Pasted!' : 'Paste from clipboard'}
          </button>
        </div>
        <textarea
          className="textarea-field"
          rows={8}
          placeholder={placeholder}
          value={textValue}
          onChange={e => onTextChange(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">{textValue.length.toLocaleString()} characters</p>
      </div>

      {/* File Upload */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Upload documents</label>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-colors group"
        >
          <Upload className="w-5 h-5 text-gray-300 group-hover:text-brand-400 mx-auto mb-2 transition-colors" />
          <p className="text-xs font-medium text-gray-500 group-hover:text-brand-600 transition-colors">
            Drag & drop or click to upload
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, MD — up to 20 MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            className="hidden"
            onChange={handleFiles}
          />
        </div>

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {files.map(f => (
              <FileChip
                key={f.id}
                file={f}
                onRemove={() => onFilesChange(files.filter(x => x.id !== f.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ContextCapture({ context, onSave }: Props) {
  const [local, setLocal] = useState(context)

  const domainPlaceholder = `Example:
- Company: RetailCo — mid-market e-commerce platform
- Existing products: RetailCo Inventory (SAP), RetailCo POS (custom), RetailCo CRM (Salesforce)
- Current gaps: no self-service customer portal, manual returns process
- Business goals: reduce CSAT ticket volume by 40%, increase repeat purchase rate
- Key stakeholders: VP Commerce, Head of Customer Ops, Engineering Director`

  const techPlaceholder = `Example:
- Cloud: Azure (primary), multi-region (East US, West Europe)
- API style: REST + OpenAPI 3.1; async events via Azure Service Bus
- Auth: Azure AD B2C for customer-facing; Azure AD for internal
- Existing APIs: Inventory API v2, OMS API v3, Recommendations Service
- Architecture decisions: ADR-012 (event sourcing for orders), ADR-019 (BFF pattern)
- Frontend: React 18, TypeScript, Tailwind CSS; mobile: React Native`

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Context Setup</h1>
        <p className="text-sm text-gray-500 mt-1">
          Give the AI a foundation to work from. The richer the context, the more precise the epics and stories.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <ContextPanel
          icon={<BookOpen className="w-4.5 h-4.5 text-emerald-600" />}
          title="Domain Context"
          subtitle="Business, product landscape, company environment, existing capabilities"
          textValue={local.domainText}
          onTextChange={v => setLocal(p => ({ ...p, domainText: v }))}
          files={local.domainFiles}
          onFilesChange={files => setLocal(p => ({ ...p, domainFiles: files }))}
          placeholder={domainPlaceholder}
          accentColor="bg-emerald-50"
        />
        <ContextPanel
          icon={<Cpu className="w-4.5 h-4.5 text-violet-600" />}
          title="Technology Context"
          subtitle="Architecture, API standards, ADRs, infrastructure, existing tech stack"
          textValue={local.techText}
          onTextChange={v => setLocal(p => ({ ...p, techText: v }))}
          files={local.techFiles}
          onFilesChange={files => setLocal(p => ({ ...p, techFiles: files }))}
          placeholder={techPlaceholder}
          accentColor="bg-violet-50"
        />
      </div>

      {/* Context summary bar */}
      <div className="card p-4 flex items-center gap-6 mb-8 bg-gray-50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Domain:</span>
          {local.domainText.length > 0 || local.domainFiles.length > 0
            ? <span className="text-emerald-600 font-medium">✓ Provided ({local.domainText.length} chars{local.domainFiles.length > 0 ? ` + ${local.domainFiles.length} file(s)` : ''})</span>
            : <span className="text-gray-400">Not yet provided</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Tech:</span>
          {local.techText.length > 0 || local.techFiles.length > 0
            ? <span className="text-violet-600 font-medium">✓ Provided ({local.techText.length} chars{local.techFiles.length > 0 ? ` + ${local.techFiles.length} file(s)` : ''})</span>
            : <span className="text-gray-400">Not yet provided</span>}
        </div>
        <div className="ml-auto text-xs text-gray-400">
          You can update context at any time
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => onSave(local)} className="btn-primary flex items-center gap-2">
          Continue to Requirements
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
