import { useRef, useState } from 'react'
import { streamChat } from '../api/chatApi'
import type { ChatRequest } from '../types'

export function useStreamingChat() {
  const [text, setText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  async function start(request: ChatRequest) {
    setText('')
    setError(null)
    setIsStreaming(true)

    // 새 스트리밍 요청을 취소할 수 있도록 AbortController를 준비한다
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // 백엔드 SSE 스트림을 열고 이벤트 타입에 따라 UI 상태를 갱신한다
      await streamChat(request, {
        signal: abortController.signal,
        onEvent: (event) => {
          if (event.type === 'delta') {
            setText((current) => current + event.text)
          }
          if (event.type === 'error') {
            setError(event.error)
          }
          if (event.type === 'done') {
            setIsStreaming(false)
          }
        },
      })
    } catch (err) {
      if (!abortController.signal.aborted) {
        setError(err instanceof Error ? err.message : '채팅 스트림 처리 중 오류가 발생했습니다.')
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  function abort() {
    // 사용자가 중지를 누르면 현재 SSE 요청을 취소한다
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }

  return { text, isStreaming, error, start, abort }
}
