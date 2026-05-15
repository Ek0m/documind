'use client'

import { Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'

interface DocumentOutputProps {
  output: string
  creditsUsed: number
  newBalance: number
}

export function DocumentOutput({ output, creditsUsed, newBalance }: DocumentOutputProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Output header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600">AI Output</span>
          <span className="text-xs text-gray-400 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            −{creditsUsed} credits
          </span>
          <span className="text-xs text-gray-400">
            Balance: <strong>{newBalance} credits</strong>
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {copied ? <CheckCheck size={12} className="text-green-600" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Output body */}
      <div className="p-4 bg-white">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
          {output}
        </pre>
      </div>
    </div>
  )
}
