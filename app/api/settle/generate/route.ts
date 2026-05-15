import { NextRequest, NextResponse } from 'next/server'
import { settle, handleSettleError } from '@/lib/settle'



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

    // 1. Fetch Dynamic Pricing: Retrieve exact active rule cost configured in Dashboard
    const bootstrap = await settle.billing.bootstrap(userId)
    const pricingRule = bootstrap.walletState.activeRules.find(rule => rule.eventType === 'DOCUMENT_GENERATE')
    const creditCost = pricingRule ? pricingRule.cost : 15 // Dynamic rule value with code-fallback

    // 2. Gatekeeper Debit: Prevent executing AI for users with insufficient funds
    await settle.wallet.debit(userId, {
      amount: creditCost,
      description: 'Document generation — DocuMind',
    })

    // 3. Execute operation
    const output = await mockGenerate(prompt)

    // 4. Telemetry Stream: Log usage without triggering background double-billing
    await settle.events.track({
      userId,
      eventType: 'DOCUMENT_GENERATE',
      quantity: 1,
      metadata: { 
        promptLength: prompt.length, 
        creditCost: creditCost,
        skipBilling: true, // Critical: Handled by our custom events processor flag
      },
    })

    const { balance: newBalance } = await settle.wallet.getBalance(userId)

    return NextResponse.json({
      ok: true,
      data: { output, creditsUsed: creditCost, newBalance },
    })

  } catch (error) {
    return handleSettleError(error, 'Generate failed')
  }
}

