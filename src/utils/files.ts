import type { AIProvider, UploadedFile } from '../types'

export function supportsNativePDF(provider: AIProvider): boolean {
  return provider === 'anthropic' || provider === 'google'
}

export async function readFileContent(
  file: File,
): Promise<{ content: string; contentType: 'text' | 'pdf' | 'unsupported' }> {
  const isPDF = file.type === 'application/pdf'
  const isText =
    file.type.startsWith('text/') ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.txt')

  if (isPDF) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve({ content: base64, contentType: 'pdf' })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  if (isText) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ content: reader.result as string, contentType: 'text' })
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  return { content: '', contentType: 'unsupported' }
}

// Inject text-file content into a prompt string (for providers that don't support native attachments)
export function injectTextFiles(files: UploadedFile[]): string {
  const textFiles = files.filter(f => f.contentType === 'text' && f.content)
  if (!textFiles.length) return ''
  return textFiles
    .map(f => `\n--- Attached file: ${f.name} ---\n${f.content}`)
    .join('\n')
}
