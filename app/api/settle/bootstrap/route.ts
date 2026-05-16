import { NextResponse } from 'next/server'
import { settle, handleSettleError } from '@/lib/settle'

export async function GET() {
  try {
    const userId = process.env.NEXT_PUBLIC_TEST_USER_ID ?? 'test_user_001'
    if (!settle.billing) {
      // Fallback for SDK v0.1.0
      return NextResponse.json({ 
        ok: true, 
        data: {
          availablePackages: [
            { id: 'standard', name: 'Standard Pack', credits: 100, priceKobo: 50000 }
          ],
          activeRules: [],
          walletState: { currentBalance: 0 },
          uiConfig: { themeColor: '#000000', title: 'DocuMind' }
        }
      })
    }
    const bootstrap = await settle.billing.bootstrap(userId)
    return NextResponse.json({ ok: true, data: bootstrap })
  } catch (error) {
    console.error('[DocuMind Bootstrap Error]', error)
    return handleSettleError(error, 'Bootstrap failed')
  }
}

