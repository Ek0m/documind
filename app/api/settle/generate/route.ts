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
