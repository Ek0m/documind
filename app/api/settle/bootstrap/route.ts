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
