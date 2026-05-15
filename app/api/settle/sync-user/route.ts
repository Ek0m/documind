import { NextResponse } from 'next/server'
import { settle, handleSettleError } from '@/lib/settle'

export async function POST() {
  try {
    const user = await settle.users.sync({
      externalUserId: process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001',
      email: process.env.NEXT_PUBLIC_TEST_USER_EMAIL ?? 'testuser@documind.dev',
      name: 'DocuMind Test User',
      metadata: { app: 'documind', environment: 'development' },
    })
    return NextResponse.json({ ok: true, data: user })
  } catch (error) {
    return handleSettleError(error, 'Failed to sync user')
  }
}

