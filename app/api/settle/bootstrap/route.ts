import { NextResponse } from 'next/server'
import { settle, handleSettleError } from '@/lib/settle'

export async function GET() {
  try {
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'
    const bootstrap = await settle.billing.bootstrap(userId)
    return NextResponse.json({ ok: true, data: bootstrap })
  } catch (error) {
    return handleSettleError(error, 'Bootstrap failed')
  }
}

