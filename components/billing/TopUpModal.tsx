'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

const PACKAGES = [
  { id: 'starter', credits: 50,  price: '₦500',   label: 'Starter',  popular: false },
  { id: 'popular', credits: 150, price: '₦1,000', label: 'Popular',  popular: true  },
  { id: 'power',   credits: 400, price: '₦2,000', label: 'Power',    popular: false },
] as const

interface TopUpModalProps {
  open: boolean
  onClose: () => void
}

export function TopUpModal({ open, onClose }: TopUpModalProps) {
  const [selected, setSelected] = useState<string>('popular')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTopUp() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settle/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selected }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      // Redirect to Paystack checkout
      window.location.href = json.data.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Top-up failed')
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Top up your wallet" size="sm">
      <div className="space-y-3">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => setSelected(pkg.id)}
            className={clsx(
              'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left',
              selected === pkg.id
                ? 'border-black bg-gray-50'
                : 'border-gray-200 hover:border-gray-300',
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{pkg.label}</span>
                {pkg.popular && (
                  <span className="text-xs bg-black text-white px-1.5 py-0.5 rounded-full">
                    Most popular
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{pkg.credits} credits</p>
            </div>
            <span className="text-sm font-bold text-gray-900">{pkg.price}</span>
          </button>
        ))}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button
          onClick={handleTopUp}
          loading={loading}
          className="w-full mt-2"
          size="lg"
        >
          Pay with Paystack →
        </Button>

        <p className="text-xs text-gray-400 text-center">
          Secured by SettleSettle + Paystack
        </p>
      </div>
    </Modal>
  )
}
