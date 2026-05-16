import { NextRequest, NextResponse } from 'next/server'
import { settle, handleSettleError } from '@/lib/settle'


export async function POST(req: NextRequest) {
  try {
    const { packageId, provider = 'paystack' } = await req.json() as { packageId: string, provider?: 'paystack' | 'solana' }
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'
    const email  = process.env.NEXT_PUBLIC_TEST_USER_EMAIL ?? 'testuser@documind.dev'

    // Fetch dynamic package data from SettleSettle bootstrap
    // Fallback for SDK v0.1.0 which lacks the billing module
    let pkg;
    if (settle.billing) {
      const bootstrap = await settle.billing.bootstrap(userId)
      pkg = bootstrap.availablePackages.find(p => p.id === packageId)
    } else {
      // Fallback to standard package if SDK is old
      if (packageId === 'standard') {
        pkg = { id: 'standard', name: 'Standard Pack', credits: 100, priceKobo: 50000 }
      }
    }

    if (!pkg) {
      return NextResponse.json(
        { ok: false, error: `Invalid or inactive package selected: ${packageId}` },
        { status: 400 }
      )
    }

    const callbackUrl = `${req.nextUrl.origin}/?success=true`
    const { checkoutUrl, reference } = await (settle.payments.initialize as any)({
      endUserId: userId,
      amountKobo: pkg.priceKobo, // Use dynamic price from dashboard
      email,
      provider,
      callbackUrl,
      metadata: {
        packageId,
        credits: pkg.credits,
        app: 'documind',
      },
    })

    return NextResponse.json({
      ok: true,
      data: { 
        checkoutUrl, 
        reference, 
        package: { 
          id: pkg.id, 
          credits: pkg.credits, 
          amountKobo: pkg.priceKobo,
          label: pkg.name 
        } 
      },
    })

  } catch (error) {
    return handleSettleError(error, 'Top-up failed')
  }
}

