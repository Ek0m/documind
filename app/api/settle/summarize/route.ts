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
