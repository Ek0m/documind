import { NextResponse } from 'next/server'
import { settle } from '@/lib/settle'

export async function GET() {
  try {
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'
    const { balance } = await settle.wallet.getBalance(userId)
    return NextResponse.json({ ok: true, data: { balance } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get balance'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
