import { useEffect, useState } from 'react'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { listDocuments } from '../features/documents/api/documentApi'
import DocumentUploader from '../features/documents/components/DocumentUploader'
import type { DocumentItem } from '../features/documents/types'
import { createLectureSession, deleteLectureSession, listLectureSessions } from '../features/lectureSessions/api/lectureSessionApi'
import type { LectureSession } from '../features/lectureSessions/types'
import { useAuthStore } from '../stores/authStore'

const CATEGORIES = ['인프라', '개발', '클라우드', '보안', '사내문서']
const LEVELS = ['입문', '초급', '중급', '고급']

export default function AdminPage() {
  const logout = useAuthStore((state) => state.logout)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [sessions, setSessions] = useState<LectureSession[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [level, setLevel] = useState(LEVELS[0])
  const [error, setError] = useState<string | null>(null)

  async function loadAdminData() {
    const [documentItems, sessionItems] = await Promise.all([listDocuments(), listLectureSessions()])
    setDocuments(documentItems)
    setSessions(sessionItems)
  }

  useEffect(() => {
    void loadAdminData().catch((err) => setError(err instanceof Error ? err.message : '관리자 데이터를 불러오지 못했습니다.'))
  }, [])

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId],
    )
  }

  async function handleCreateSession() {
    if (!title.trim() || selectedDocumentIds.length === 0) {
      setError('강의 제목과 연결할 문서를 선택해주세요.')
      return
    }

    try {
      const session = await createLectureSession({
        title,
        description: description || null,
        category,
        level,
        document_ids: selectedDocumentIds,
      })
      setSessions((current) => [session, ...current])
      setTitle('')
      setDescription('')
      setCategory(CATEGORIES[0])
      setLevel(LEVELS[0])
      setSelectedDocumentIds([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '강의 세션 생성에 실패했습니다.')
    }
  }

  async function handleDeleteSession(sessionId: string) {
    const shouldDelete = window.confirm('이 강의 세션을 삭제할까요? 업로드된 문서는 삭제되지 않습니다.')
    if (!shouldDelete) {
      return
    }

    try {
      await deleteLectureSession(sessionId)
      setSessions((current) => current.filter((session) => session.id !== sessionId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '강의 세션 삭제에 실패했습니다.')
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <BrandMark compact />
          <p className="eyebrow">Admin Console</p>
          <h1 className="title">강의 자료와 세션 준비</h1>
          <p className="subtitle">담당자는 문서를 올리고 신입이 학습할 강의 세션에 자료를 연결합니다.</p>
        </div>
        <Button variant="secondary" onClick={() => void logout()}>
          로그아웃
        </Button>
      </header>

      <section className="admin-grid">
        <div className="stack">
          <DocumentUploader
            onUploaded={(document) => {
              setDocuments((current) => [document, ...current])
            }}
          />
          <Card className="stack">
            <div>
              <p className="eyebrow">Documents</p>
              <h2 style={{ margin: 0 }}>강의 자료 선택</h2>
              <p className="muted">세션에 포함할 문서를 선택하세요.</p>
            </div>
            {documents.length === 0 ? <p className="muted">아직 업로드된 문서가 없습니다.</p> : null}
            {documents.map((document) => (
              <button
                key={document.id}
                type="button"
                className="select-card"
                data-selected={selectedDocumentIds.includes(document.id)}
                onClick={() => toggleDocument(document.id)}
              >
                <strong>{document.title}</strong>
                <span>{document.file_type.toUpperCase()}</span>
              </button>
            ))}
          </Card>
        </div>

        <Card tone="strong" className="stack">
          <div>
            <p className="eyebrow">Lecture Session</p>
            <h2 style={{ margin: 0 }}>강의 세션 만들기</h2>
          </div>
          <Input label="강의 제목" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="ui-input-wrap">
            <span>카테고리</span>
            <select className="ui-input" value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-input-wrap">
            <span>난이도</span>
            <select className="ui-input" value={level} onChange={(event) => setLevel(event.target.value)}>
              {LEVELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-input-wrap">
            <span>강의 설명</span>
            <textarea
              className="ui-input"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <Button type="button" onClick={() => void handleCreateSession()}>
            세션 생성
          </Button>
          <div className="stack">
            {sessions.map((session) => (
              <div key={session.id} className="select-card">
                <strong>{session.title}</strong>
                <span className="muted">
                  {session.category} · {session.level}
                </span>
                <span className="muted">{session.documents.length}개 문서 연결</span>
                <Button type="button" variant="danger" onClick={() => void handleDeleteSession(session.id)}>
                  삭제
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  )
}
