import { NextRequest, NextResponse } from 'next/server'
import { settle, handleSettleError } from '@/lib/settle'

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
    return handleSettleError(error, 'Top-up failed')
  }
}

