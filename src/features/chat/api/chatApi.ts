import { buildApiUrl } from '../../../lib/apiClient'
import { getStoredTokens } from '../../../lib/tokenStorage'
import type { ChatRequest, ChatResponse } from '../types'

type ChatHandlers = {
  signal?: AbortSignal
}

export async function requestChat(payload: ChatRequest, handlers: ChatHandlers = {}): Promise<ChatResponse> {
  const { accessToken } = getStoredTokens()

  // 채팅 요청에도 현재 access token을 Bearer 헤더로 전달한다
  const response = await fetch(buildApiUrl('/api/v1/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: handlers.signal,
  })

  if (!response.ok) {
    throw new Error('채팅 응답을 생성하지 못했습니다.')
  }

  return (await response.json()) as ChatResponse
}

export async function synthesizeChatTts(text: string): Promise<Blob> {
  const { accessToken } = getStoredTokens()

  const response = await fetch(buildApiUrl('/api/v1/chat/tts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    throw new Error('음성 변환에 실패했습니다.')
  }

  return response.blob()
}
