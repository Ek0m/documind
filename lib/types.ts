export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  error: string
  code?: string
  currentBalance?: number
  requestedAmount?: number
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

export interface DocumentAction {
  type: 'summarize' | 'generate'
  content: string
}

export interface AiResult {
  output: string
  creditsUsed: number
  newBalance: number
}
