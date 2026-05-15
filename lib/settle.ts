import { SettleSettle } from 'settlesettle'

if (!process.env.SETTLESETTLE_API_KEY) {
  throw new Error(
    'SETTLESETTLE_API_KEY is not set. Add it to .env.local'
  )
}

export const settle = new SettleSettle({
  apiKey: process.env.SETTLESETTLE_API_KEY,
  baseUrl: process.env.SETTLESETTLE_BASE_URL ?? 'https://api.settlesettle.com',
  timeout: 10_000,
  eventBuffering: {
    enabled: true,
    maxBatchSize: 20,
    flushIntervalMs: 3000,
  },
  retry: {
    maxRetries: 2,
    backoffFactor: 2,
  },
})
