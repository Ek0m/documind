'use client'

import { Modal } from '@/components/ui/Modal'
import { useState } from 'react'
import { Zap, Tv } from 'lucide-react'

interface InsufficientModalProps {
  open: boolean
  onClose: () => void
  currentBalance: number
  requiredCredits: number
  onTopUp: () => void
  onWatchAd: () => Promise<void>
}

export function InsufficientModal({
  open,
  onClose,
  currentBalance,
  requiredCredits,
  onTopUp,
  onWatchAd,
}: InsufficientModalProps) {
  const [watchingAd, setWatchingAd] = useState(false)
  const [adDone, setAdDone] = useState(false)

  async function handleWatchAd() {
    setWatchingAd(true)
    // Simulate watching a 5-second ad
    await new Promise((r) => setTimeout(r, 5000))
    await onWatchAd()
    setWatchingAd(false)
    setAdDone(true)
    // Close after showing success briefly
    setTimeout(() => {
      onClose()
      setAdDone(false)
    }, 1500)
  }

  return (
    <Modal open={open} onClose={onClose} title="Not enough credits" size="sm">
      <div className="space-y-4">
        {/* Status */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="text-amber-800">
            You have <strong>{currentBalance} credits</strong> but this action
            requires <strong>{requiredCredits} credits</strong>.
          </p>
        </div>

        {/* Option 1: Top up */}
        <button
          onClick={() => { onTopUp(); onClose() }}
          className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Buy credits</p>
            <p className="text-xs text-gray-500">Starting from ₦500 for 50 credits</p>
          </div>
        </button>

        {/* Option 2: Watch ad */}
        <button
          onClick={handleWatchAd}
          disabled={watchingAd || adDone}
          className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Tv size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {adDone ? '✅ +5 credits added!' : 'Watch a short ad'}
            </p>
            <p className="text-xs text-gray-500">
              {watchingAd ? 'Watching ad… (5s)' : 'Earn 5 free credits instantly'}
            </p>
          </div>
          {watchingAd && (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          SettleSettle ad fallback — zero code on your side
        </p>
      </div>
    </Modal>
  )
}
