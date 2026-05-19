import { useRef, useState } from 'react'
import { getStoredTokens } from '../../../lib/tokenStorage'
import { startStt, type SttRecorderSession } from '../audio/sttRecorder'

type SttRecordingState = 'idle' | 'requesting' | 'recording' | 'processing' | 'error'

type StartOptions = {
  onTranscript: (text: string) => void | Promise<void>
}

export function useSttRecording() {
  const [state, setState] = useState<SttRecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<SttRecorderSession | null>(null)

  async function start(options: StartOptions) {
    if (sessionRef.current || state === 'requesting' || state === 'recording') {
      return
    }

    const { accessToken } = getStoredTokens()
    if (!accessToken) {
      setState('error')
      setError('로그인 후 음성 질문을 사용할 수 있습니다.')
      return
    }

    setState('requesting')
    setError(null)

    try {
      const session = await startStt({
        token: accessToken,
        language: 'ko',
        onReady: () => setState('recording'),
        onStatus: (event) => {
          if ([3, 4, 5].includes(event.status)) {
            setState('processing')
          }
        },
        onResult: (event) => {
          const text = event.text?.trim()
          sessionRef.current = null
          setState('idle')
          if (text) {
            void options.onTranscript(text)
          }
        },
        onError: (message) => {
          sessionRef.current = null
          setState('error')
          setError(message)
        },
        onClose: () => {
          sessionRef.current = null
          setState((current) => (current === 'error' ? current : 'idle'))
        },
      })
      sessionRef.current = session
    } catch (err) {
      sessionRef.current = null
      setState('error')
      setError(err instanceof Error ? err.message : '음성 입력을 시작하지 못했습니다.')
    }
  }

  function stop() {
    sessionRef.current?.stop()
    sessionRef.current = null
    setState('idle')
  }

  return {
    state,
    error,
    isRecording: state === 'requesting' || state === 'recording' || state === 'processing',
    start,
    stop,
  }
}
