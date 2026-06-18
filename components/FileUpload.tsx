'use client'

import { useRef, useState } from 'react'
import { Paperclip, Loader } from 'lucide-react'

interface Props {
  onFileLoaded: (text: string, filename: string, previewUrl: string, fileType: 'pdf' | 'docx') => void
  filename: string
  onDismiss: () => void
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_CHARS = 80_000

export default function FileUpload({ onFileLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!inputRef.current) return
    inputRef.current.value = ''
    if (!file) return

    setError('')

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      setError('Only PDF and DOCX files are supported.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File exceeds the 10 MB limit.')
      return
    }

    setParsing(true)
    try {
      if (ext === 'pdf') {
        await parsePDF(file)
      } else {
        await parseDOCX(file)
      }
    } catch {
      setError('Could not read this file. Please try a different file.')
    } finally {
      setParsing(false)
    }
  }

  async function parsePDF(file: File) {
    const blobUrl = URL.createObjectURL(file)
    const arrayBuffer = await file.arrayBuffer()

    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      fullText += pageText + '\n'
    }

    if (fullText.trim().length < 100) {
      URL.revokeObjectURL(blobUrl)
      setError('This PDF appears to be scanned. Please upload a text-based PDF.')
      return
    }

    if (fullText.length > MAX_CHARS) {
      fullText = fullText.slice(0, MAX_CHARS)
    }

    onFileLoaded(fullText, file.name, blobUrl, 'pdf')
  }

  async function parseDOCX(file: File) {
    const arrayBuffer = await file.arrayBuffer()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mammoth: any = await import('mammoth/mammoth.browser.js')
    const result = await mammoth.extractRawText({ arrayBuffer })

    if (!result.value.trim()) {
      setError('Could not read this DOCX file. Please try a different file.')
      return
    }

    let text = result.value
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS)

    onFileLoaded(text, file.name, '', 'docx')
  }

  return (
    <div className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={parsing}
        className="flex items-center justify-center rounded-md transition-colors duration-100"
        style={{
          width: '32px',
          height: '32px',
          color: 'var(--an-fg-muted)',
          cursor: parsing ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!parsing) (e.currentTarget.style.color = 'var(--an-fg-base)')
        }}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--an-fg-muted)')}
        title="Attach PDF or DOCX"
      >
        {parsing ? (
          <Loader size={16} strokeWidth={1.5} className="animate-spin" />
        ) : (
          <Paperclip size={16} strokeWidth={1.5} />
        )}
      </button>
      {error && (
        <p
          className="absolute bottom-full mb-1 left-0 text-xs px-2 py-1 rounded"
          style={{
            color: 'var(--an-error)',
            backgroundColor: 'var(--an-bg-elevated)',
            border: '1px solid var(--an-border-base)',
            whiteSpace: 'nowrap',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
