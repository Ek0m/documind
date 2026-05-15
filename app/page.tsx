'use client'

import { useState, useEffect, useCallback } from 'react'
import { WalletHeader } from '@/components/billing/WalletHeader'
import { InsufficientModal } from '@/components/billing/InsufficientModal'
import { TopUpModal } from '@/components/billing/TopUpModal'
import { DocumentInput } from '@/components/document/DocumentInput'
import { DocumentOutput } from '@/components/document/DocumentOutput'
import { Spinner } from '@/components/ui/Spinner'

interface OutputState {
  output: string
  creditsUsed: number
  newBalance: number
}

interface InsufficientState {
  currentBalance: number
  requestedAmount: number
}

export default function Home() {
  const [balance, setBalance]     = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [actionLoading, setActionLoading]   = useState(false)
  const [bootstrapping, setBootstrapping]   = useState(true)

  const [output, setOutput]       = useState<OutputState | null>(null)
  const [error, setError]         = useState<string | null>(null)

  // Modal state
  const [showInsufficient, setShowInsufficient] = useState(false)
  const [insufficientState, setInsufficientState] = useState<InsufficientState | null>(null)
  const [showTopUp, setShowTopUp] = useState(false)

  // ── On mount: sync user + bootstrap ──
  useEffect(() => {
    async function init() {
      try {
        // Sync user profile
        await fetch('/api/settle/sync-user', { method: 'POST' })

        // Bootstrap billing modal data (one round-trip)
        const res = await fetch('/api/settle/bootstrap')
        const json = await res.json()
        if (json.ok) {
          setBalance(json.data.walletState.currentBalance)
        }
      } catch (err) {
        console.error('Initialization failed', err)
      } finally {
        setBootstrapping(false)
        setBalanceLoading(false)
      }
    }
    void init()
  }, [])

  // ── Refresh balance ──
  const refreshBalance = useCallback(async () => {
    setBalanceLoading(true)
    try {
      const res = await fetch('/api/settle/balance')
      const json = await res.json()
      if (json.ok) setBalance(json.data.balance)
    } catch (err) {
      console.error('Balance refresh failed', err)
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  // ── Handle API response ──
  function handleActionResponse(json: Record<string, unknown>) {
    if (json.ok) {
      const data = json.data as OutputState
      setOutput(data)
      setBalance(data.newBalance)
      setError(null)
    } else if (json.code === 'INSUFFICIENT_CREDITS') {
      setInsufficientState({
        currentBalance: json.currentBalance as number,
        requestedAmount: json.requestedAmount as number,
      })
      setShowInsufficient(true)
    } else {
      setError(json.error as string)
    }
  }

  // ── Summarize ──
  async function handleSummarize(text: string) {
    setActionLoading(true)
    setError(null)
    setOutput(null)
    try {
      const res = await fetch('/api/settle/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const json = await res.json()
      handleActionResponse(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summarize request failed')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Generate ──
  async function handleGenerate(prompt: string) {
    setActionLoading(true)
    setError(null)
    setOutput(null)
    try {
      const res = await fetch('/api/settle/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const json = await res.json()
      handleActionResponse(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate request failed')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Watch ad ──
  async function handleWatchAd() {
    try {
      const res = await fetch('/api/settle/ad-reward', { method: 'POST' })
      const json = await res.json()
      if (json.ok) {
        setBalance(json.data.newBalance)
      }
    } catch (err) {
      console.error('Ad reward request failed', err)
    }
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-8 h-8 text-black" />
          <p className="text-sm text-gray-500 animate-pulse">Hydrating DocuMind...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <WalletHeader
        balance={balance}
        loading={balanceLoading}
        onRefresh={refreshBalance}
        onTopUp={() => setShowTopUp(true)}
      />

      <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        {/* Hero with premium gradient accents */}
        <div className="mb-8 relative overflow-hidden p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-100 rounded-full filter blur-3xl opacity-60"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-100 rounded-full filter blur-3xl opacity-60"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              AI Document Suite
            </h1>
            <p className="text-gray-500 mt-2 max-w-2xl text-lg leading-relaxed">
              Analyze and generate documents instantly using mocked AI, perfectly integrated with{' '}
              <span className="text-indigo-600 font-semibold">
                SettleSettle metering & billing.
              </span>
            </p>
          </div>
        </div>

        {/* SettleSettle debug panel */}
        <div className="mb-6 p-4 bg-gray-900 text-white rounded-xl border border-gray-800 font-mono text-xs shadow-inner">
          <p className="text-gray-400 mb-2 uppercase tracking-wider text-[10px] font-bold">SettleSettle SDK Runtime Status</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>Bootstrap hydrated</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>User synced</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-300">
              <span className="font-semibold">Balance:</span>
              <span>{balance ?? '?'} credits</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <span className="font-semibold">User:</span>
              <span>{process.env.NEXT_PUBLIC_TEST_USER_ID}</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-6">
          {/* Input Box */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
              Draft Input
            </h2>
            <DocumentInput
              onSummarize={handleSummarize}
              onGenerate={handleGenerate}
              loading={actionLoading}
              disabled={actionLoading}
            />
          </div>

          {/* Loading state */}
          {actionLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
              <Spinner className="w-6 h-6 text-indigo-600" />
              <p className="text-sm text-gray-500 font-medium">
                AI is thinking... (credits will be deducted shortly)
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-bold">⚠️ Action Failed:</span>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Output Card */}
          {output && !actionLoading && (
            <div className="animate-fade-in shadow-lg rounded-xl">
              <DocumentOutput
                output={output.output}
                creditsUsed={output.creditsUsed}
                newBalance={output.newBalance}
              />
            </div>
          )}
        </div>

        {/* Feature checklist */}
        <div className="mt-12 p-6 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-2xl border border-indigo-100 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4">
            🧪 SettleSettle Integration Telemetry
          </h3>
          <ul className="text-xs font-medium text-indigo-800 grid grid-cols-1 md:grid-cols-2 gap-3">
            <li className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-indigo-50">
              <span>✅</span>
              <span>Bootstrap hydration loaded (1 round-trip)</span>
            </li>
            <li className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-indigo-50">
              <span>✅</span>
              <span>End-User profile auto-synced</span>
            </li>
            <li className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-indigo-50">
              <span>✅</span>
              <span>Automatic credit metering deduction</span>
            </li>
            <li className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-indigo-50">
              <span>✅</span>
              <span>Async usage telemetry buffering</span>
            </li>
            <li className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-indigo-50">
              <span>✅</span>
              <span>Automatic InsufficientCredits error hook</span>
            </li>
            <li className="flex items-center gap-2 bg-white/60 px-3 py-2 rounded-lg border border-indigo-50">
              <span>✅</span>
              <span>Paywall + Monetized Ad Reward fallback</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Modals */}
      <InsufficientModal
        open={showInsufficient}
        onClose={() => setShowInsufficient(false)}
        currentBalance={insufficientState?.currentBalance ?? 0}
        requiredCredits={insufficientState?.requestedAmount ?? 0}
        onTopUp={() => { setShowInsufficient(false); setShowTopUp(true) }}
        onWatchAd={handleWatchAd}
      />

      <TopUpModal
        open={showTopUp}
        onClose={() => setShowTopUp(false)}
      />
    </>
  )
}
