import { buildApiUrl } from '../../../lib/apiClient'
import { getStoredTokens } from '../../../lib/tokenStorage'
import type { ChatRequest, ChatStreamEvent } from '../types'

type StreamHandlers = {
  signal?: AbortSignal
  onEvent: (event: ChatStreamEvent) => void
}

function parseSseChunk(buffer: string): { events: ChatStreamEvent[]; rest: string } {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  const events = parts
    .map((part) => part.split('\n').find((line) => line.startsWith('data: ')))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line.replace(/^data:\s*/, '')) as ChatStreamEvent)

  return { events, rest }
}

export async function streamChat(payload: ChatRequest, handlers: StreamHandlers): Promise<void> {
  const { accessToken } = getStoredTokens()

  // SSE 요청에도 현재 access token을 Bearer 헤더로 전달한다
  const response = await fetch(buildApiUrl('/api/v1/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: handlers.signal,
  })

  if (!response.ok || !response.body) {
    throw new Error('채팅 스트림을 시작하지 못했습니다.')
  }

  // 브라우저 ReadableStream reader로 SSE 바이트 스트림을 읽는다
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    // 다음 SSE chunk를 읽어 스트림 종료 여부를 확인한다
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    // 누적 버퍼에서 완성된 SSE 이벤트를 파싱한다
    const parsed = parseSseChunk(buffer)
    buffer = parsed.rest

    for (const event of parsed.events) {
      handlers.onEvent(event)
    }
  }
}
