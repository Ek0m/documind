import { NextRequest, NextResponse } from 'next/server'
import { settle, handleSettleError } from '@/lib/settle'



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

    // Step 1: Fetch Dynamic Pricing from SettleSettle Dashboard
    const bootstrap = await settle.billing.bootstrap(userId)
    const pricingRule = bootstrap.walletState.activeRules.find(rule => rule.eventType === 'DOCUMENT_SUMMARIZE')
    const creditCost = pricingRule ? pricingRule.cost : 10 // Dashboard slider control with fallback

    // Step 2: Gatekeeper Debit: Deduct dynamic amount BEFORE executing AI API
    await settle.wallet.debit(userId, {
      amount: creditCost,
      description: 'Document summary — DocuMind',
    })

    // Step 3: Run Operation
    const output = await mockSummarize(text)

    // Step 4: Chronological Telemetry Logging (bypassing background billing)
    await settle.events.track({
      userId,
      eventType: 'DOCUMENT_SUMMARIZE',
      quantity: 1,
      metadata: { 
        wordCount: text.split(' ').length, 
        creditCost: creditCost,
        skipBilling: true, // Prevent background auto-debit engine double billing
      },
    })

    // Step 5: Get updated balance for UI
    const { balance: newBalance } = await settle.wallet.getBalance(userId)

    return NextResponse.json({
      ok: true,
      data: { output, creditsUsed: creditCost, newBalance },
    })

  } catch (error) {
    return handleSettleError(error, 'Summarize failed')
  }
}

