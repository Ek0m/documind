import { NextResponse } from 'next/server'
import { settle, handleSettleError } from '@/lib/settle'

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
    return handleSettleError(error, 'Ad reward failed')
  }
}

