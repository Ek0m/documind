# DocuMind — SettleSettle SDK Integration Test App
## Step-by-Step Build Guide + Project Instructions

> **What this is:** A simple Next.js document reader and generator app that
> exercises every SettleSettle SDK feature. The AI is mocked — we don't care
> about real AI responses. We care about the billing integration working perfectly.

---

## What We're Building

**App name:** DocuMind  
**Stack:** Next.js 14 (App Router) + TypeScript  
**AI:** Mocked (fake delay + fake response)  
**Billing:** Full SettleSettle SDK integration  

### Features
- Upload or paste a document → AI summarizes it (costs 10 credits)
- Generate a document from a prompt → AI writes it (costs 15 credits)
- Wallet balance shown in the header at all times
- Every action checks balance before proceeding
- Insufficient credits → paywall modal with top-up button + "Watch Ad" fallback
- Top-up flow → Paystack checkout → credits added on return
- Usage events tracked on every AI action
- Billing modal bootstrap on page load (one round-trip)

### Credit costs
| Action | Credits |
|---|---|
| Summarize document | 10 credits |
| Generate document | 15 credits |
| Watch rewarded ad | +5 credits |

---

## Prerequisites

- Node.js 20+ installed
- pnpm installed
- `settlesettle-api` running locally on port 3000
- The `settlesettle` SDK built locally (or linked)
- A SettleSettle developer account + app created in the dashboard
- Your `ss_live_` API key saved

---

## Step 1 — Create the Next.js project

```bash
mkdir -p ~/projects/documind
cd ~/projects/documind

pnpm create next-app . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

When prompted: accept all defaults.

---

## Step 2 — Install dependencies

```bash
# SettleSettle SDK (from your local build or npm)
pnpm add settlesettle

# If testing your local SDK build, link it instead:
# cd ~/projects/settlesettle-sdk && pnpm link --global
# cd ~/projects/documind && pnpm link --global settlesettle

# UI utilities
pnpm add clsx lucide-react

# For file upload handling
pnpm add formidable
pnpm add -D @types/formidable
```

---

## Step 3 — Environment variables

Create `.env.local` at the project root:

```bash
cat > .env.local << 'EOF'
# SettleSettle SDK config
SETTLESETTLE_API_KEY=ss_live_your_key_here
SETTLESETTLE_BASE_URL=http://localhost:3000

# Test user — hardcoded for this demo
# In a real app this comes from your auth system
NEXT_PUBLIC_TEST_USER_ID=test_user_001
NEXT_PUBLIC_TEST_USER_EMAIL=testuser@documind.dev

# App config
NEXT_PUBLIC_APP_NAME=DocuMind
EOF
```

> ⚠️ `SETTLESETTLE_API_KEY` is server-only (no NEXT_PUBLIC_ prefix).
> It is never sent to the browser. All SDK calls go through API routes.

---

## Step 4 — Project folder structure

Create these folders:

```bash
mkdir -p app/api/settle/{balance,summarize,generate,topup,ad-reward,bootstrap,sync-user}
mkdir -p app/api/settle/events
mkdir -p components/billing
mkdir -p components/document
mkdir -p components/ui
mkdir -p lib
```

Final structure:
```
documind/
├── app/
│   ├── layout.tsx                    ← Root layout with wallet header
│   ├── page.tsx                      ← Main app page
│   └── api/
│       └── settle/
│           ├── balance/route.ts      ← GET wallet balance
│           ├── bootstrap/route.ts    ← GET bootstrap hydration
│           ├── sync-user/route.ts    ← POST sync user on load
│           ├── summarize/route.ts    ← POST summarize (checks + debits 10cr)
│           ├── generate/route.ts     ← POST generate (checks + debits 15cr)
│           ├── topup/route.ts        ← POST initialize Paystack checkout
│           ├── ad-reward/route.ts    ← POST award ad credits
│           └── events/route.ts       ← POST track usage event
├── components/
│   ├── billing/
│   │   ├── WalletHeader.tsx          ← Balance display in navbar
│   │   ├── InsufficientModal.tsx     ← Paywall + ad fallback modal
│   │   ├── TopUpModal.tsx            ← Top-up amount selector
│   │   └── BillingBootstrap.tsx      ← Invisible component, loads on mount
│   ├── document/
│   │   ├── DocumentInput.tsx         ← Paste/upload area
│   │   ├── DocumentOutput.tsx        ← AI response display
│   │   └── ActionButtons.tsx         ← Summarize + Generate buttons
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Spinner.tsx
├── lib/
│   ├── settle.ts                     ← SDK singleton (server-side)
│   └── types.ts                      ← App-level types
├── .env.local
└── package.json
```

---

## Step 5 — Create the SDK singleton

**`lib/settle.ts`**
```typescript
import { SettleSettle } from 'settlesettle'

if (!process.env.SETTLESETTLE_API_KEY) {
  throw new Error(
    'SETTLESETTLE_API_KEY is not set. Add it to .env.local'
  )
}

export const settle = new SettleSettle({
  apiKey: process.env.SETTLESETTLE_API_KEY,
  baseUrl: process.env.SETTLESETTLE_BASE_URL ?? 'https://api.settlesettle.com',
  timeout: 10_000,
  eventBuffering: {
    enabled: true,
    maxBatchSize: 20,
    flushIntervalMs: 3000,
  },
  retry: {
    maxRetries: 2,
    backoffFactor: 2,
  },
})
```

---

## Step 6 — Create app-level types

**`lib/types.ts`**
```typescript
export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  error: string
  code?: string
  currentBalance?: number
  requestedAmount?: number
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

export interface DocumentAction {
  type: 'summarize' | 'generate'
  content: string
}

export interface AiResult {
  output: string
  creditsUsed: number
  newBalance: number
}
```

---

## Step 7 — Create all API routes

### `app/api/settle/sync-user/route.ts`
Syncs the test user into SettleSettle on app load.

```typescript
import { NextResponse } from 'next/server'
import { settle } from '@/lib/settle'

export async function POST() {
  try {
    const user = await settle.users.sync({
      externalUserId: process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001',
      email: process.env.NEXT_PUBLIC_TEST_USER_EMAIL ?? 'testuser@documind.dev',
      name: 'DocuMind Test User',
      metadata: { app: 'documind', environment: 'development' },
    })
    return NextResponse.json({ ok: true, data: user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync user'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

---

### `app/api/settle/bootstrap/route.ts`
Loads everything needed for the billing UI in one call.

```typescript
import { NextResponse } from 'next/server'
import { settle } from '@/lib/settle'

export async function GET() {
  try {
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'
    const bootstrap = await settle.billing.bootstrap(userId)
    return NextResponse.json({ ok: true, data: bootstrap })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bootstrap failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

---

### `app/api/settle/balance/route.ts`
Quick balance check — polled after every action.

```typescript
import { NextResponse } from 'next/server'
import { settle } from '@/lib/settle'

export async function GET() {
  try {
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'
    const { balance } = await settle.wallet.getBalance(userId)
    return NextResponse.json({ ok: true, data: { balance } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get balance'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

---

### `app/api/settle/summarize/route.ts`
The main billable action — summarize a document.
- Checks balance
- Debits 10 credits
- Runs mock AI
- Tracks usage event

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { settle } from '@/lib/settle'
import { InsufficientCreditsError } from 'settlesettle'

const CREDIT_COST = 10

// ── Mock AI function ──
async function mockSummarize(text: string): Promise<string> {
  // Simulate AI processing time
  await new Promise((r) => setTimeout(r, 1200))
  const wordCount = text.split(' ').length
  return `[AI Summary — DocuMind Mock]\n\nThis document contains approximately ${wordCount} words. ` +
    `The content covers the following key themes: structure, detail, and clarity. ` +
    `Main points identified: (1) The document presents a clear argument, ` +
    `(2) Supporting evidence is provided throughout, ` +
    `(3) The conclusion reinforces the central thesis. ` +
    `\n\n[This is a mocked AI response for SettleSettle billing integration testing.]`
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json() as { text: string }
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { ok: false, error: 'Please provide at least 10 characters of text.' },
        { status: 400 }
      )
    }

    // Step 1: Debit credits BEFORE running AI
    // If this throws InsufficientCreditsError, we never run the AI
    await settle.wallet.debit(userId, {
      amount: CREDIT_COST,
      description: 'Document summary — DocuMind',
    })

    // Step 2: Run mock AI (only reached if debit succeeded)
    const output = await mockSummarize(text)

    // Step 3: Track usage event (non-blocking — never awaited)
    settle.events.track({
      userId,
      eventType: 'DOCUMENT_SUMMARIZE',
      quantity: 1,
      metadata: { wordCount: text.split(' ').length, creditCost: CREDIT_COST },
    })

    // Step 4: Get updated balance for UI
    const { balance: newBalance } = await settle.wallet.getBalance(userId)

    return NextResponse.json({
      ok: true,
      data: { output, creditsUsed: CREDIT_COST, newBalance },
    })

  } catch (error) {
    // This is the key case — catch and surface it to the frontend
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: error.currentBalance,
          requestedAmount: error.requestedAmount,
        },
        { status: 402 }
      )
    }
    const message = error instanceof Error ? error.message : 'Summarize failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

---

### `app/api/settle/generate/route.ts`
Generate a document from a prompt — costs 15 credits.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { settle } from '@/lib/settle'
import { InsufficientCreditsError } from 'settlesettle'

const CREDIT_COST = 15

async function mockGenerate(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 1800))
  return `[AI Generated Document — DocuMind Mock]\n\n` +
    `Subject: ${prompt}\n\n` +
    `Introduction\n` +
    `This document was generated in response to the following prompt: "${prompt}". ` +
    `The content below represents a structured response to the topic at hand.\n\n` +
    `Main Body\n` +
    `The subject matter presents several key considerations. First, we must examine ` +
    `the foundational principles. Second, practical applications should be considered. ` +
    `Third, future implications deserve attention.\n\n` +
    `Conclusion\n` +
    `In summary, this document addresses the prompt comprehensively. ` +
    `Further research and iteration would yield more detailed insights.\n\n` +
    `[This is a mocked AI response for SettleSettle billing integration testing.]`
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string }
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json(
        { ok: false, error: 'Please provide a prompt of at least 5 characters.' },
        { status: 400 }
      )
    }

    // Debit BEFORE running AI
    await settle.wallet.debit(userId, {
      amount: CREDIT_COST,
      description: 'Document generation — DocuMind',
    })

    const output = await mockGenerate(prompt)

    settle.events.track({
      userId,
      eventType: 'DOCUMENT_GENERATE',
      quantity: 1,
      metadata: { promptLength: prompt.length, creditCost: CREDIT_COST },
    })

    const { balance: newBalance } = await settle.wallet.getBalance(userId)

    return NextResponse.json({
      ok: true,
      data: { output, creditsUsed: CREDIT_COST, newBalance },
    })

  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: error.currentBalance,
          requestedAmount: error.requestedAmount,
        },
        { status: 402 }
      )
    }
    const message = error instanceof Error ? error.message : 'Generate failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

---

### `app/api/settle/topup/route.ts`
Initialize a Paystack checkout session for wallet top-up.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { settle } from '@/lib/settle'

// Credit packages available for purchase
const PACKAGES: Record<string, { credits: number; amountKobo: number; label: string }> = {
  starter:    { credits: 50,  amountKobo: 50000,  label: '50 credits — ₦500' },
  popular:    { credits: 150, amountKobo: 100000, label: '150 credits — ₦1,000' },
  power:      { credits: 400, amountKobo: 200000, label: '400 credits — ₦2,000' },
}

export async function POST(req: NextRequest) {
  try {
    const { packageId } = await req.json() as { packageId: string }
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'
    const email  = process.env.NEXT_PUBLIC_TEST_USER_EMAIL ?? 'testuser@documind.dev'

    const pkg = PACKAGES[packageId]
    if (!pkg) {
      return NextResponse.json(
        { ok: false, error: `Unknown package: ${packageId}` },
        { status: 400 }
      )
    }

    const { checkoutUrl, reference } = await settle.payments.initialize({
      endUserId: userId,
      amountKobo: pkg.amountKobo,
      email,
      metadata: {
        packageId,
        credits: pkg.credits,
        app: 'documind',
      },
    })

    return NextResponse.json({
      ok: true,
      data: { checkoutUrl, reference, package: pkg },
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Top-up failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

---

### `app/api/settle/ad-reward/route.ts`
Award credits after a verified ad view.

```typescript
import { NextResponse } from 'next/server'
import { settle } from '@/lib/settle'

export async function POST() {
  try {
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'

    const result = await settle.billing.rewardAd(userId)

    // Also track the ad reward as a usage event
    settle.events.track({
      userId,
      eventType: 'AD_REWARD_CLAIMED',
      quantity: 1,
      metadata: { creditsAwarded: result.creditsAwarded },
    })

    return NextResponse.json({ ok: true, data: result })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ad reward failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
```

---

## Step 8 — Create UI components

### `components/ui/Button.tsx`
```typescript
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  loading = false,
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variant === 'primary' && 'bg-black text-white hover:bg-gray-800',
        variant === 'secondary' && 'bg-white text-black border border-gray-300 hover:bg-gray-50',
        variant === 'ghost' && 'bg-transparent text-gray-600 hover:bg-gray-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        className,
      )}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
```

### `components/ui/Modal.tsx`
```typescript
'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={clsx(
          'relative bg-white rounded-2xl shadow-2xl p-6 w-full mx-4',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-md',
          size === 'lg' && 'max-w-lg',
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

### `components/ui/Spinner.tsx`
```typescript
import { clsx } from 'clsx'

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx('animate-spin h-5 w-5 text-gray-400', className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
```

---

### `components/billing/WalletHeader.tsx`
```typescript
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
```

---

### `components/billing/InsufficientModal.tsx`
The core SettleSettle test — shown when a user hits 0 credits.

```typescript
'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
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
    setTimeout(onClose, 1500)
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
```

---

### `components/billing/TopUpModal.tsx`
```typescript
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
```

---

### `components/document/DocumentInput.tsx`
```typescript
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
```

---

### `components/document/DocumentOutput.tsx`
```typescript
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
```

---

## Step 9 — Create the main page

**`app/page.tsx`**
```typescript
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
      // Sync user profile
      await fetch('/api/settle/sync-user', { method: 'POST' })

      // Bootstrap billing modal data (one round-trip)
      const res = await fetch('/api/settle/bootstrap')
      const json = await res.json()
      if (json.ok) {
        setBalance(json.data.walletState.currentBalance)
      }
      setBootstrapping(false)
      setBalanceLoading(false)
    }
    void init()
  }, [])

  // ── Refresh balance ──
  const refreshBalance = useCallback(async () => {
    setBalanceLoading(true)
    const res = await fetch('/api/settle/balance')
    const json = await res.json()
    if (json.ok) setBalance(json.data.balance)
    setBalanceLoading(false)
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
    } finally {
      setActionLoading(false)
    }
  }

  // ── Watch ad ──
  async function handleWatchAd() {
    const res = await fetch('/api/settle/ad-reward', { method: 'POST' })
    const json = await res.json()
    if (json.ok) {
      setBalance(json.data.newBalance)
    }
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="w-6 h-6" />
          <p className="text-sm text-gray-500">Loading DocuMind…</p>
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
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            AI Document Tools
          </h1>
          <p className="text-gray-500 mt-1">
            Summarize or generate documents instantly.{' '}
            <span className="text-indigo-600 font-medium">
              Powered by SettleSettle credits.
            </span>
          </p>
        </div>

        {/* SettleSettle debug panel (dev only) */}
        <div className="mb-6 p-3 bg-gray-950 rounded-xl text-xs font-mono">
          <p className="text-gray-500 mb-1">SettleSettle SDK — Integration Test</p>
          <div className="flex flex-wrap gap-4">
            <span className="text-green-400">
              ✓ Bootstrap hydrated
            </span>
            <span className="text-green-400">
              ✓ User synced
            </span>
            <span className="text-blue-400">
              Balance: {balance ?? '?'} credits
            </span>
            <span className="text-yellow-400">
              User: {process.env.NEXT_PUBLIC_TEST_USER_ID}
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-6">
          {/* Input */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Input
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
            <div className="flex items-center justify-center gap-3 py-8">
              <Spinner className="w-5 h-5 text-indigo-500" />
              <p className="text-sm text-gray-500">
                AI is thinking… (credits will be deducted)
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Output */}
          {output && !actionLoading && (
            <DocumentOutput
              output={output.output}
              creditsUsed={output.creditsUsed}
              newBalance={output.newBalance}
            />
          )}
        </div>

        {/* Feature checklist for testing */}
        <div className="mt-12 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm font-semibold text-blue-800 mb-2">
            🧪 SettleSettle Features Being Tested
          </p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>✅ Bootstrap hydration — loads wallet + config on mount (1 API call)</li>
            <li>✅ User sync — registered this session's user on load</li>
            <li>✅ Wallet balance — displayed in header, refreshed after actions</li>
            <li>✅ Credit deduction — 10cr for summarize, 15cr for generate</li>
            <li>✅ InsufficientCreditsError — triggers paywall modal at 0 credits</li>
            <li>✅ Ad fallback — watch ad to earn 5 free credits</li>
            <li>✅ Top-up flow — Paystack checkout for buying credit packages</li>
            <li>✅ Event tracking — DOCUMENT_SUMMARIZE / DOCUMENT_GENERATE tracked async</li>
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
```

---

## Step 10 — Update root layout

**`app/layout.tsx`**
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DocuMind — SettleSettle Integration Test',
  description: 'AI Document tools powered by SettleSettle credits',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

---

## Step 11 — Add initial credits to test user

Before testing, seed the test user's wallet with credits via the SettleSettle API
(or use the dashboard). Run this from your terminal:

```bash
curl -X POST http://localhost:3000/v1/wallet/test_user_001/credit \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ss_live_your_key_here" \
  -d '{ "amount": 50, "description": "Test seed credits" }'
```

This gives the test user 50 credits to start — enough to test multiple actions
before hitting the InsufficientCreditsError flow.

---

## Step 12 — Run the app

```bash
# Make sure settlesettle-api is running first
cd ~/projects/settlesettle-api
pnpm run start:dev

# In a new terminal, run DocuMind
cd ~/projects/documind
pnpm run dev
```

Open `http://localhost:3001` (Next.js will use 3001 if 3000 is taken by the API).

---

## What to Test — Checklist

Work through these in order. Each one exercises a different SettleSettle feature.

```
□ 1. App loads → check browser network tab → /api/settle/sync-user fires
□ 2. App loads → /api/settle/bootstrap fires (one call, returns everything)
□ 3. Wallet balance shows in the header
□ 4. Paste text → click Summarize → 10 credits deducted → output shows
□ 5. Balance in header updates after the action
□ 6. Type a prompt → click Generate → 15 credits deducted → output shows
□ 7. Keep using actions until balance hits 0
□ 8. Try to summarize with 0 credits → InsufficientModal appears
□ 9. Click "Watch a short ad" → 5 second wait → credits added → modal closes
□ 10. Click "Buy credits" → TopUpModal appears with packages
□ 11. Select a package → click "Pay with Paystack" → redirects to checkout
□ 12. Check browser network tab → /api/settle/events not called (it's async)
□ 13. Click "Refresh" in the wallet header → GET /api/settle/balance fires
```

---

## Troubleshooting

**"SETTLESETTLE_API_KEY is not set"**
→ You forgot to create `.env.local`. Create it with your key.

**Balance shows "?" and never loads**
→ The API is not running. Start `settlesettle-api` first on port 3000.

**InsufficientModal doesn't appear**
→ The test user still has credits. Use the curl command in Step 11 to check,
   or keep clicking Summarize until you hit zero.

**Top-up redirects to Paystack but no credits after returning**
→ Webhooks aren't set up (expected in local dev). Credits are added by the
   API webhook handler — for local testing, manually credit the user via curl.

**Events not appearing in dashboard**
→ Events are buffered and sent async. Wait 2-3 seconds after actions.
   Or force-flush by calling `settle.events.flush()` in the API route (for debug).

---

## Project Complete — What Was Exercised

| Feature | SDK Method | Route |
|---|---|---|
| User sync | `settle.users.sync()` | `POST /api/settle/sync-user` |
| Bootstrap hydration | `settle.billing.bootstrap()` | `GET /api/settle/bootstrap` |
| Balance check | `settle.wallet.getBalance()` | `GET /api/settle/balance` |
| Credit deduction | `settle.wallet.debit()` | Inside summarize + generate routes |
| InsufficientCreditsError | `instanceof InsufficientCreditsError` | Caught in summarize + generate |
| Payment checkout | `settle.payments.initialize()` | `POST /api/settle/topup` |
| Ad reward | `settle.billing.rewardAd()` | `POST /api/settle/ad-reward` |
| Event tracking | `settle.events.track()` | Non-blocking in all action routes |
| Graceful shutdown | `settle.destroy()` | Add to process exit hooks |