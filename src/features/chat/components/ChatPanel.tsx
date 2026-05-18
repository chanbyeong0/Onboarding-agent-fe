import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import type { Checkpoint } from '../../checkpoints/types'
import type { DocumentItem } from '../../documents/types'
import type { ChatRequest } from '../types'
import { synthesizeChatTts } from '../api/chatApi'
import { useSttRecording } from '../hooks/useSttRecording'
import { useStreamingChat } from '../hooks/useStreamingChat'

type ChatPanelProps = {
  sessionId?: string | null
  selectedDocument: DocumentItem | null
  currentPageNumber?: number | null
  checkpoints: Checkpoint[]
}

export default function ChatPanel({ sessionId = null, selectedDocument, currentPageNumber = null, checkpoints }: ChatPanelProps) {
  const [message, setMessage] = useState('')
  const { text, isStreaming, error, start, abort } = useStreamingChat()
  const stt = useSttRecording()
  const [isTtsLoading, setIsTtsLoading] = useState(false)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [ttsAudioSrc, setTtsAudioSrc] = useState<string | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const ttsAudioBlobRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (ttsAudioBlobRef.current) {
        URL.revokeObjectURL(ttsAudioBlobRef.current)
      }
    }
  }, [])

  async function handleReadAloud() {
    if (!text || isTtsLoading) return
    setIsTtsLoading(true)
    setTtsError(null)

    if (ttsAudioBlobRef.current) {
      URL.revokeObjectURL(ttsAudioBlobRef.current)
      ttsAudioBlobRef.current = null
    }
    setTtsAudioSrc(null)

    try {
      const blob = await synthesizeChatTts(text)
      const blobUrl = URL.createObjectURL(blob)
      ttsAudioBlobRef.current = blobUrl
      setTtsAudioSrc(blobUrl)
    } catch (err) {
      setTtsError(err instanceof Error ? err.message : '음성 변환에 실패했습니다.')
    } finally {
      setIsTtsLoading(false)
    }
  }

  useEffect(() => {
    if (!ttsAudioSrc || !ttsAudioRef.current) return
    ttsAudioRef.current.load()
    void ttsAudioRef.current.play().catch(() => {})
  }, [ttsAudioSrc])

  const checkpointTexts = useMemo(() => checkpoints.map((checkpoint) => checkpoint.content), [checkpoints])

  function buildChatRequest(nextMessage: string): ChatRequest | null {
    if (!selectedDocument || !nextMessage.trim()) {
      return null
    }

    return {
      message: nextMessage,
      session_id: sessionId,
      document_id: selectedDocument.id,
      page_number: currentPageNumber,
      checkpoints: checkpointTexts,
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const request = buildChatRequest(message)
    if (!request) {
      return
    }

    // 선택 문서와 체크포인트를 함께 담아 일반 채팅 요청을 시작한다
    await start(request)
  }

  async function handleVoiceTranscript(transcript: string) {
    setMessage(transcript)
    const request = buildChatRequest(transcript)
    if (!request) {
      return
    }
    await start(request)
  }

  function handleVoiceClick() {
    if (stt.isRecording) {
      stt.stop()
      return
    }
    void stt.start({
      onTranscript: handleVoiceTranscript,
    })
  }

  return (
    <Card tone="strong" className="stack">
      <div>
        <p className="eyebrow">AI Mentor</p>
        <h2 style={{ margin: 0 }}>AI 사수에게 질문</h2>
        <p className="muted">{selectedDocument ? `${selectedDocument.title} 기준으로 답변합니다.` : '먼저 문서를 선택하세요.'}</p>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="ui-input-wrap">
          <span>{currentPageNumber ? `${currentPageNumber}페이지 질문` : '질문'}</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '14px',
              color: 'var(--text)',
              background: '#ffffff',
              border: '1px solid var(--line)',
              borderRadius: '14px',
              resize: 'vertical',
            }}
          />
        </label>
        <div className="chat-actions">
          <Button type="submit" disabled={!selectedDocument || isStreaming}>
            {isStreaming ? '응답 생성 중...' : '질문 보내기'}
          </Button>
          <Button type="button" variant={stt.isRecording ? 'danger' : 'secondary'} disabled={!selectedDocument || isStreaming} onClick={handleVoiceClick}>
            {stt.isRecording ? '음성 입력 중지' : '음성으로 질문하기'}
          </Button>
          {isStreaming ? (
            <Button type="button" variant="secondary" onClick={abort}>
              중지
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
      {stt.error ? <p className="error-text">{stt.error}</p> : null}
      {stt.isRecording ? <p className="muted">{stt.state === 'processing' ? '음성을 텍스트로 변환 중입니다.' : '질문을 듣고 있습니다. 발화가 끝나면 자동으로 전송합니다.'}</p> : null}
      <div className="chat-response">
        {text || <span className="muted">AI 응답이 여기에 표시됩니다.</span>}
      </div>
      {text && !isStreaming ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button type="button" variant="secondary" disabled={isTtsLoading} onClick={() => void handleReadAloud()}>
            {isTtsLoading ? '음성 변환 중...' : '🔊 읽어주기'}
          </Button>
          {ttsError ? <p className="error-text">{ttsError}</p> : null}
          {ttsAudioSrc ? (
            <audio ref={ttsAudioRef} controls src={ttsAudioSrc} style={{ width: '100%' }} />
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
