'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

interface Package {
  id: string
  name: string
  credits: number
  priceKobo: number
}

interface TopUpModalProps {
  open: boolean
  onClose: () => void
}

export function TopUpModal({ open, onClose }: TopUpModalProps) {
  const [packages, setPackages] = useState<Package[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [provider, setProvider] = useState<'paystack' | 'solana'>('paystack')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dynamic packages from dashboard on open
  useEffect(() => {
    if (!open) return
    async function load() {
      try {
        const res = await fetch('/api/settle/bootstrap')
        const json = await res.json()
        if (json.ok) {
          const pkgs = json.data.availablePackages
          setPackages(pkgs)
          if (pkgs.length > 0 && !selected) {
            setSelected(pkgs[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load packages', err)
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [open, selected])

  const selectedPackage = packages.find(p => p.id === selected)
  const formatPrice = (kobo: number) => {
    return (kobo / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
  }

  async function handleTopUp() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settle/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selected, provider }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      
      // Redirect to generated checkout session URL (Paystack OR Solana)
      window.location.href = json.data.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Top-up failed')
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Top up your wallet" size="sm">
      <div className="space-y-4">
        {/* Package Selector */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">1. Select Package</span>
          <div className="space-y-2">
            {fetching ? (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                <span className="text-xs text-gray-400 animate-pulse">Syncing packages from dashboard...</span>
              </div>
            ) : packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelected(pkg.id)}
                className={clsx(
                  'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left',
                  selected === pkg.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{pkg.name}</span>
                    {pkg.credits >= 400 && (
                      <span className="text-[9px] font-extrabold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{pkg.credits} credits</p>
                </div>
                <span className="text-sm font-black text-gray-900">{formatPrice(pkg.priceKobo)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Provider Selector */}
        <div className="space-y-2.5 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">2. Payment Method</span>
          <div className="grid grid-cols-2 gap-3">
            {/* Paystack Selector */}
            <button
              type="button"
              onClick={() => setProvider('paystack')}
              className={clsx(
                'flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-center gap-2 relative group overflow-hidden',
                provider === 'paystack'
                  ? 'border-black bg-gray-50 ring-1 ring-black/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
              )}
            >
              <svg className={clsx("h-5 w-5 transition-colors", provider === 'paystack' ? 'text-black' : 'text-gray-400 group-hover:text-gray-700')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-gray-900">Paystack</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Card & Transfer</p>
              </div>
            </button>

            {/* Solana Crypto Selector */}
            <button
              type="button"
              onClick={() => setProvider('solana')}
              className={clsx(
                'flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all text-center gap-2 relative group overflow-hidden',
                provider === 'solana'
                  ? 'border-purple-600 bg-purple-50/30 ring-1 ring-purple-500/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
              )}
            >
              <svg className={clsx("h-5 w-5 transition-colors", provider === 'solana' ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-700')} fill="currentColor" viewBox="0 0 397.7 311.7">
                <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h314.8c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zm0-118.9c2.4-2.4 5.7-3.8 9.2-3.8h314.8c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zm326.6-81.2c4.1 4.1 1.2 11.1-4.6 11.1H73.8c-3.5 0-6.8-1.4-9.2-3.8L1.9 42.4C-2.2 38.3.7 31.3 6.5 31.3H324c3.5 0 6.8 1.4 9.2 3.8l62.7 62.7v.1z"/>
              </svg>
              <div>
                <p className="text-xs font-bold text-gray-900">Solana Pay</p>
                <p className="text-[9px] text-purple-500/80 font-semibold mt-0.5">Web3 Crypto</p>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</p>
        )}

        <Button
          onClick={handleTopUp}
          loading={loading || fetching}
          disabled={!selected}
          className={clsx(
            "w-full mt-2 shadow-lg shadow-black/5 font-bold",
            provider === 'solana' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/10 border-purple-600' : ''
          )}
          size="lg"
        >
          {provider === 'solana' ? 'Pay with USDC Web3 →' : `Pay ${selectedPackage ? formatPrice(selectedPackage.priceKobo) : ''} →`}
        </Button>

        <p className="text-[10px] text-gray-400 text-center leading-normal select-none pt-1">
          Payment clearance handled securely via <span className="font-bold text-gray-500">SettleSettle Gateway</span>.
        </p>
      </div>
    </Modal>
  )
}
