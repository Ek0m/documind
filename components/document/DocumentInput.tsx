'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FileText, Wand2 } from 'lucide-react'
import { clsx } from 'clsx'

type Mode = 'summarize' | 'generate'

interface DocumentInputProps {
  onSummarize: (text: string) => Promise<void>
  onGenerate: (prompt: string) => Promise<void>
  loading: boolean
  disabled: boolean
}

export function DocumentInput({ onSummarize, onGenerate, loading, disabled }: DocumentInputProps) {
  const [mode, setMode] = useState<Mode>('summarize')
  const [text, setText] = useState('')

  function handleSubmit() {
    if (!text.trim()) return
    if (mode === 'summarize') {
      void onSummarize(text)
    } else {
      void onGenerate(text)
    }
  }

  const placeholder = mode === 'summarize'
    ? 'Paste your document here to summarize it...\n\nExample: Meeting notes, articles, reports, any long text.'
    : 'Describe what you want to generate...\n\nExample: "Write a professional email declining a meeting request."'

  const creditsLabel = mode === 'summarize' ? '10 credits' : '15 credits'

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setMode('summarize')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            mode === 'summarize'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <FileText size={14} />
          Summarize
          <span className="text-xs text-gray-400">10cr</span>
        </button>
        <button
          onClick={() => setMode('generate')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
            mode === 'generate'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Wand2 size={14} />
          Generate
          <span className="text-xs text-gray-400">15cr</span>
        </button>
      </div>

      {/* Text area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full resize-none rounded-xl border border-gray-200 p-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 transition-all"
      />

      {/* Submit */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          This action costs <strong>{creditsLabel}</strong>
        </p>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={disabled || !text.trim()}
          size="md"
        >
          {mode === 'summarize' ? 'Summarize →' : 'Generate →'}
        </Button>
      </div>
    </div>
  )
}
