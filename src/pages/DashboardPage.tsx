import { useCallback, useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useCheckpoints } from '../features/checkpoints/hooks/useCheckpoints'
import ChatPanel from '../features/chat/components/ChatPanel'
import DocumentList from '../features/documents/components/DocumentList'
import DocumentUploader from '../features/documents/components/DocumentUploader'
import { listDocuments } from '../features/documents/api/documentApi'
import type { DocumentItem } from '../features/documents/types'
import { useAuthStore } from '../stores/authStore'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { checkpoints, addCheckpoint, error: checkpointError } = useCheckpoints()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const [checkpointContent, setCheckpointContent] = useState('')
  const [checkpointPage, setCheckpointPage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    try {
      // 백엔드 문서 목록 API에서 업로드된 문서들을 조회한다
      const items = await listDocuments()
      setDocuments(items)
      setSelectedDocument((current) => current ?? items[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 목록을 불러오지 못했습니다.')
    }
  }, [])

  async function handleAddCheckpoint() {
    if (!selectedDocument || !checkpointContent.trim()) {
      return
    }

    // 선택된 문서 기준으로 사용자가 모르는 항목을 체크포인트로 저장한다
    const created = await addCheckpoint({
      document_id: selectedDocument.id,
      page_number: checkpointPage ? Number(checkpointPage) : null,
      content: checkpointContent,
    })
    if (created) {
      setCheckpointContent('')
      setCheckpointPage('')
    }
  }

  useEffect(() => {
    // 대시보드 진입 시 등록 문서 목록을 초기 로딩한다
    void loadDocuments()
  }, [loadDocuments])

  return (
    <main className="page-shell">
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
        <div>
          <p className="eyebrow">Onboarding AI Agent</p>
          <h1 className="title">Industrial Onboarding Cockpit</h1>
          <p className="subtitle">
            문서를 임무 자료로 올리고, 모르는 항목을 체크한 뒤 AI 사수에게 바로 질문하세요.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
          <span className="muted">{user?.name ?? '사용자'}님</span>
          <Button variant="secondary" onClick={() => void logout()}>
            로그아웃
          </Button>
        </div>
      </header>

      <section className="dashboard-grid">
        <div className="stack">
          <DocumentUploader
            onUploaded={(document) => {
              setDocuments((current) => [document, ...current])
              setSelectedDocument(document)
            }}
          />
          <DocumentList documents={documents} selectedDocumentId={selectedDocument?.id ?? null} onSelect={setSelectedDocument} />
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <Card className="stack">
          <div>
            <p className="eyebrow">Unknown Items</p>
            <h2 style={{ margin: 0 }}>미확인 항목 체크</h2>
            <p className="muted">{selectedDocument ? selectedDocument.title : '문서를 선택하면 체크포인트를 저장할 수 있습니다.'}</p>
          </div>
          <input
            className="ui-input"
            placeholder="페이지 번호(선택)"
            value={checkpointPage}
            onChange={(event) => setCheckpointPage(event.target.value)}
          />
          <textarea
            placeholder="모르는 항목을 입력하세요"
            value={checkpointContent}
            onChange={(event) => setCheckpointContent(event.target.value)}
            rows={4}
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
          {checkpointError ? <p className="error-text">{checkpointError}</p> : null}
          <Button type="button" disabled={!selectedDocument} onClick={() => void handleAddCheckpoint()}>
            체크 저장
          </Button>
          <div className="stack">
            {checkpoints.map((checkpoint) => (
              <div key={checkpoint.id} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 16 }}>
                <strong>{checkpoint.content}</strong>
                <br />
                <span className="muted">page {checkpoint.page_number ?? '-'}</span>
              </div>
            ))}
          </div>
        </Card>

        <ChatPanel selectedDocument={selectedDocument} checkpoints={checkpoints} />
      </section>
    </main>
  )
}
