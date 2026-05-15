import { SettleSettle, SettleSettleError, InsufficientCreditsError } from 'settlesettle'
import { NextResponse } from 'next/server'

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

/**
 * Standard SettleSettle SDK error handler for Next.js API routes.
 * Extracts the most detailed error message from the SDK error classes and payload.
 */
export function handleSettleError(error: unknown, fallbackMessage: string) {
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

  if (error instanceof SettleSettleError) {
    let message: string = fallbackMessage
    
    // Use SDK error message if it is not the default "[object Object]" stringification
    if (typeof error.message === 'string' && error.message !== '[object Object]' && !error.message.includes('[object Object]')) {
      message = error.message
    }

    // Deep parse from the raw API response payload if available (e.g., NestJS validation errors)
    const payload = error.payload as any
    if (payload?.message) {
      if (typeof payload.message === 'string') {
        message = payload.message
      } else if (typeof payload.message === 'object' && payload.message !== null) {
        const deepMsg = payload.message.message
        if (typeof deepMsg === 'string') {
          message = deepMsg
        } else if (Array.isArray(deepMsg)) {
          message = deepMsg.join(', ')
        }
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
        code: error.code,
      },
      { status: error.statusCode || 400 }
    )
  }

  const message = error instanceof Error ? error.message : fallbackMessage
  return NextResponse.json({ ok: false, error: message }, { status: 500 })
}

