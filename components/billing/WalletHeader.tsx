'use client'

import { Wallet, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

interface WalletHeaderProps {
  balance: number | null
  loading: boolean
  onRefresh: () => void
  onTopUp: () => void
}

export function WalletHeader({ balance, loading, onRefresh, onTopUp }: WalletHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <span className="font-semibold text-gray-900">DocuMind</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Powered by SettleSettle
          </span>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium',
              balance === 0
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-gray-200 bg-gray-50 text-gray-700',
            )}
          >
            <Wallet size={14} />
            {loading ? (
              <span className="text-gray-400">—</span>
            ) : (
              <span>
                {balance ?? '?'}{' '}
                <span className="font-normal text-gray-500">credits</span>
              </span>
            )}
            <button
              onClick={onRefresh}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
              title="Refresh balance"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <button
            onClick={onTopUp}
            className="px-3 py-1.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            + Top Up
          </button>
        </div>
      </div>
    </header>
  )
}
