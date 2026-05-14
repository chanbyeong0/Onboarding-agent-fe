import { FormEvent, useMemo, useState } from 'react'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import Input from '../../../components/ui/Input'
import type { Checkpoint } from '../../checkpoints/types'
import type { DocumentItem } from '../../documents/types'
import { useStreamingChat } from '../hooks/useStreamingChat'

type ChatPanelProps = {
  selectedDocument: DocumentItem | null
  checkpoints: Checkpoint[]
}

export default function ChatPanel({ selectedDocument, checkpoints }: ChatPanelProps) {
  const [message, setMessage] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const { text, isStreaming, error, start, abort } = useStreamingChat()

  const checkpointTexts = useMemo(() => checkpoints.map((checkpoint) => checkpoint.content), [checkpoints])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedDocument || !message.trim()) {
      return
    }

    // 선택 문서와 체크포인트를 함께 담아 SSE 채팅 요청을 시작한다
    await start({
      message,
      document_id: selectedDocument.id,
      page_number: pageNumber ? Number(pageNumber) : null,
      checkpoints: checkpointTexts,
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
        <Input label="페이지 번호(선택)" value={pageNumber} onChange={(event) => setPageNumber(event.target.value)} />
        <label className="ui-input-wrap">
          <span>질문</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            style={{
              width: '100%',
              padding: '14px',
              color: 'var(--text)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--line)',
              borderRadius: '14px',
              resize: 'vertical',
            }}
          />
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button type="submit" disabled={!selectedDocument || isStreaming}>
            {isStreaming ? '응답 수신 중...' : '질문 보내기'}
          </Button>
          {isStreaming ? (
            <Button type="button" variant="secondary" onClick={abort}>
              중지
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
      <div
        style={{
          minHeight: 160,
          padding: 16,
          whiteSpace: 'pre-wrap',
          background: 'rgba(0,0,0,0.24)',
          border: '1px solid var(--line)',
          borderRadius: 18,
        }}
      >
        {text || <span className="muted">AI 응답이 여기에 스트리밍됩니다.</span>}
      </div>
    </Card>
  )
}
