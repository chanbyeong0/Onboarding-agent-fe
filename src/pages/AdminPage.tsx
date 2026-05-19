import { useCallback, useEffect, useState } from 'react'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { buildDocumentViewerPdfUrl, listDocumentPages, listDocuments } from '../features/documents/api/documentApi'
import DocumentUploader from '../features/documents/components/DocumentUploader'
import PdfPageViewer from '../features/documents/components/PdfPageViewer'
import type { DocumentItem, DocumentPage } from '../features/documents/types'
import { createLectureSession, deleteLectureSession, listLectureSessions } from '../features/lectureSessions/api/lectureSessionApi'
import type { LectureSession } from '../features/lectureSessions/types'
import {
  assistPracticeTask,
  createPracticeTask,
  deletePracticeTask,
  generatePracticeTasks,
  listPracticeTasks,
  updatePracticeTaskStatus,
} from '../features/practiceTasks/api/practiceTaskApi'
import type { PracticeTask, PracticeTaskCreateRequest } from '../features/practiceTasks/types'
import { useAuthStore } from '../stores/authStore'

const CATEGORIES = ['인프라', '개발', '클라우드', '보안', '사내문서']
const LEVELS = ['입문', '초급', '중급', '고급']

type PracticeTaskForm = Omit<PracticeTaskCreateRequest, 'page_number'> & {
  page_number: string
}

function createEmptyPracticeTaskForm(documentId = ''): PracticeTaskForm {
  return {
    document_id: documentId,
    page_number: '1',
    title: '',
    instruction: '',
    command: '',
    expected_output: '',
    hint: '',
    safety_note: '시뮬레이션 출력이며 실제 환경은 변경되지 않습니다.',
    status: 'approved',
  }
}

type SessionPracticeCardProps = {
  session: LectureSession
  isGenerating: boolean
  isSelected: boolean
  onGenerate: (session: LectureSession) => void
  onSelect: (session: LectureSession) => void
  onDeleteSession: (sessionId: string) => void
}

function SessionPracticeCard({
  session,
  isGenerating,
  isSelected,
  onGenerate,
  onSelect,
  onDeleteSession,
}: SessionPracticeCardProps) {
  return (
    <div className="select-card" data-selected={isSelected}>
      <strong>{session.title}</strong>
      <span className="muted">
        {session.category} · {session.level}
      </span>
      <span className="muted">{session.documents.length}개 문서 연결</span>
      <div className="practice-task-actions">
        <Button type="button" variant="secondary" onClick={() => onSelect(session)}>
          실습 편집
        </Button>
        <Button type="button" variant="secondary" disabled={isGenerating} onClick={() => onGenerate(session)}>
          {isGenerating ? 'AI 초안 생성 중...' : 'AI 실습 초안 생성'}
        </Button>
        <Button type="button" variant="danger" onClick={() => onDeleteSession(session.id)}>
          삭제
        </Button>
      </div>
    </div>
  )
}

type AdminPracticeWorkspaceProps = {
  session: LectureSession
  form: PracticeTaskForm
  tasks: PracticeTask[]
  pages: DocumentPage[]
  pageCount: number
  isGenerating: boolean
  isAssisting: boolean
  onGenerate: (session: LectureSession) => void
  onFormChange: (sessionId: string, patch: Partial<PracticeTaskForm>) => void
  onAssistPracticeTask: (session: LectureSession) => void
  onCreatePracticeTask: (session: LectureSession) => void
  onApprovePracticeTask: (task: PracticeTask) => void
  onDeletePracticeTask: (task: PracticeTask) => void
  onPageCountLoaded: (documentId: string, pageCount: number) => void
}

function AdminPracticeWorkspace({
  session,
  form,
  tasks,
  pages,
  pageCount,
  isGenerating,
  isAssisting,
  onGenerate,
  onFormChange,
  onAssistPracticeTask,
  onCreatePracticeTask,
  onApprovePracticeTask,
  onDeletePracticeTask,
  onPageCountLoaded,
}: AdminPracticeWorkspaceProps) {
  const selectedDocument = session.documents.find((document) => document.id === form.document_id) ?? session.documents[0] ?? null
  const selectedPageNumber = Number(form.page_number) || 1
  const totalPageCount = pageCount || pages.length || 1
  const selectedPage = pages.find((page) => page.page_number === selectedPageNumber) ?? null
  const documentTasks = tasks.filter((task) => task.document_id === form.document_id)
  const currentPageTasks = documentTasks.filter((task) => task.page_number === selectedPageNumber)
  const viewerPdfUrl = selectedDocument ? buildDocumentViewerPdfUrl(selectedDocument.viewer_pdf_url) : null
  const handleLoaded = useCallback(
    (loadedPageCount: number) => {
      if (selectedDocument) {
        onPageCountLoaded(selectedDocument.id, loadedPageCount)
      }
    },
    [onPageCountLoaded, selectedDocument],
  )

  function movePage(delta: number) {
    const nextPage = Math.min(Math.max(selectedPageNumber + delta, 1), totalPageCount)
    onFormChange(session.id, { page_number: String(nextPage) })
  }

  function selectPracticeTask(task: PracticeTask) {
    onFormChange(session.id, {
      document_id: task.document_id,
      page_number: String(task.page_number),
    })
  }

  return (
    <section className="slide-player-grid admin-practice-workspace">
      <div className="stack">
        <Card className="stack">
          <div>
            <p className="eyebrow">Materials</p>
            <h2 style={{ margin: 0 }}>강의 문서</h2>
          </div>
          {session.documents.map((document) => (
            <button
              key={document.id}
              type="button"
              className="select-card"
              data-selected={form.document_id === document.id}
              onClick={() => onFormChange(session.id, { document_id: document.id, page_number: '1' })}
            >
              <strong>{document.title}</strong>
              <span>{document.file_type.toUpperCase()}</span>
            </button>
          ))}
        </Card>
      </div>

      <Card tone="strong" className="stack">
        <div>
          <p className="eyebrow">Slide Mapping</p>
          <h2 style={{ margin: 0 }}>{selectedDocument?.title ?? '문서를 선택하세요'}</h2>
          <p className="muted">
            {selectedDocument ? `${selectedPageNumber} / ${totalPageCount} 페이지` : '페이지를 준비 중입니다.'}
          </p>
        </div>
        <div className="slide-canvas">
          {viewerPdfUrl && selectedDocument ? (
            <PdfPageViewer
              fileUrl={viewerPdfUrl}
              pageNumber={selectedPageNumber}
              onLoaded={handleLoaded}
            />
          ) : (
            <span className="muted">표시할 PDF가 없습니다.</span>
          )}
        </div>
        <div className="slide-controls">
          <Button type="button" variant="secondary" disabled={selectedPageNumber <= 1} onClick={() => movePage(-1)}>
            이전
          </Button>
          <select className="ui-input admin-page-select" value={form.page_number} onChange={(event) => onFormChange(session.id, { page_number: event.target.value })}>
            {Array.from({ length: totalPageCount }, (_, index) => index + 1).map((pageNumber) => (
              <option key={pageNumber} value={String(pageNumber)}>
                {pageNumber}페이지
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" disabled={selectedPageNumber >= totalPageCount} onClick={() => movePage(1)}>
            다음
          </Button>
        </div>
        {selectedPage?.text ? <div className="practice-page-preview-text">{selectedPage.text}</div> : null}
      </Card>

      <div className="stack lecture-side-panel">
        <Card className="stack">
          <div>
            <p className="eyebrow">Practice Sheet</p>
            <h2 style={{ margin: 0 }}>페이지 실습 명령어</h2>
            <p className="muted">명령어 시트를 선택하면 연결된 PDF 페이지로 이동합니다.</p>
          </div>
          <Button type="button" disabled={isGenerating} onClick={() => onGenerate(session)}>
            {isGenerating ? 'AI 초안 생성 중...' : 'AI 실습 초안 생성'}
          </Button>
          {documentTasks.length === 0 ? <span className="muted">이 문서에 연결된 실습 명령어가 없습니다.</span> : null}
          <div className="practice-task-sheet-list">
            {documentTasks.map((task) => {
              const isSelectedTask = task.document_id === form.document_id && task.page_number === selectedPageNumber

              return (
                <div key={task.id} className="practice-task-admin-card" data-selected={isSelectedTask}>
                  <button type="button" className="practice-task-select-button" onClick={() => selectPracticeTask(task)}>
                    <span className="practice-task-page-pill">{task.page_number}p</span>
                    <span>
                      <strong>{task.title}</strong>
                      <span className="muted">{task.status === 'approved' ? '승인됨' : '검토 필요'}</span>
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
          {currentPageTasks.length === 0 && documentTasks.length > 0 ? <span className="muted">현재 페이지에 매핑된 시트는 없습니다. 우측 목록에서 다른 시트를 선택해 이동할 수 있습니다.</span> : null}
        </Card>

        <Card className="stack">
          <div>
            <p className="eyebrow">Current Page</p>
            <h2 style={{ margin: 0 }}>현재 페이지 시트</h2>
          </div>
          {currentPageTasks.length === 0 ? <span className="muted">현재 페이지에 연결된 실습 명령어가 없습니다.</span> : null}
          {currentPageTasks.map((task) => (
            <div key={task.id} className="practice-task-admin-card" data-selected="true">
              <div>
                <strong>{task.title}</strong>
                <span className="muted">{task.status === 'approved' ? '승인됨' : '검토 필요'}</span>
              </div>
              {task.instruction ? <span className="practice-task-instruction">{task.instruction}</span> : null}
              <code>{task.command}</code>
              {task.expected_output ? <span className="muted">예상 결과: {task.expected_output}</span> : null}
              {task.hint ? <span className="muted">힌트: {task.hint}</span> : null}
              {task.safety_note ? <span className="muted">주의: {task.safety_note}</span> : null}
              <div className="practice-task-actions">
                {task.status !== 'approved' ? (
                  <Button type="button" variant="secondary" onClick={() => onApprovePracticeTask(task)}>
                    승인
                  </Button>
                ) : null}
                <Button type="button" variant="danger" onClick={() => onDeletePracticeTask(task)}>
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </Card>

        <Card className="stack">
          <div>
            <p className="eyebrow">Manual Practice</p>
            <h2 style={{ margin: 0 }}>직접 명령어 추가</h2>
          </div>
          <Input label="실습 제목" value={form.title} onChange={(event) => onFormChange(session.id, { title: event.target.value })} />
          <label className="ui-input-wrap">
            <span>보조 지시문</span>
            <textarea
              className="ui-input"
              rows={2}
              value={form.instruction ?? ''}
              onChange={(event) => onFormChange(session.id, { instruction: event.target.value })}
            />
          </label>
          <label className="ui-input-wrap">
            <span>명령어</span>
            <textarea className="ui-input" rows={2} value={form.command} onChange={(event) => onFormChange(session.id, { command: event.target.value })} />
          </label>
          <label className="ui-input-wrap">
            <span>예상 출력</span>
            <textarea
              className="ui-input"
              rows={3}
              value={form.expected_output ?? ''}
              onChange={(event) => onFormChange(session.id, { expected_output: event.target.value })}
            />
          </label>
          <label className="ui-input-wrap">
            <span>오답 힌트</span>
            <textarea className="ui-input" rows={2} value={form.hint ?? ''} onChange={(event) => onFormChange(session.id, { hint: event.target.value })} />
          </label>
          <label className="ui-input-wrap">
            <span>주의 문구</span>
            <textarea className="ui-input" rows={2} value={form.safety_note ?? ''} onChange={(event) => onFormChange(session.id, { safety_note: event.target.value })} />
          </label>
          <label className="ui-input-wrap">
            <span>상태</span>
            <select className="ui-input" value={form.status} onChange={(event) => onFormChange(session.id, { status: event.target.value === 'approved' ? 'approved' : 'draft' })}>
              <option value="approved">바로 승인</option>
              <option value="draft">검토 필요</option>
            </select>
          </label>
          <Button type="button" variant="secondary" disabled={isAssisting || !form.command.trim()} onClick={() => onAssistPracticeTask(session)}>
            {isAssisting ? 'AI 보완 중...' : 'AI로 제목/출력 보완'}
          </Button>
          <Button type="button" onClick={() => onCreatePracticeTask(session)}>
            현재 페이지에 저장
          </Button>
        </Card>
      </div>
    </section>
  )
}

export default function AdminPage() {
  const logout = useAuthStore((state) => state.logout)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [sessions, setSessions] = useState<LectureSession[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [level, setLevel] = useState(LEVELS[0])
  const [practiceTasksBySession, setPracticeTasksBySession] = useState<Record<string, PracticeTask[]>>({})
  const [practiceTaskForms, setPracticeTaskForms] = useState<Record<string, PracticeTaskForm>>({})
  const [documentPagesById, setDocumentPagesById] = useState<Record<string, DocumentPage[]>>({})
  const [documentPageCountsById, setDocumentPageCountsById] = useState<Record<string, number>>({})
  const [selectedPracticeSessionId, setSelectedPracticeSessionId] = useState<string | null>(null)
  const [generatingSessionId, setGeneratingSessionId] = useState<string | null>(null)
  const [assistingSessionId, setAssistingSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selectedPracticeSession = sessions.find((session) => session.id === selectedPracticeSessionId) ?? sessions[0] ?? null

  async function loadAdminData() {
    const [documentItems, sessionItems] = await Promise.all([listDocuments(), listLectureSessions()])
    setDocuments(documentItems)
    setSessions(sessionItems)
    setSelectedPracticeSessionId((current) => current ?? sessionItems[0]?.id ?? null)
    setPracticeTaskForms((current) => ({
      ...Object.fromEntries(sessionItems.map((session) => [session.id, createEmptyPracticeTaskForm(session.documents[0]?.id ?? '')])),
      ...current,
    }))
    const taskEntries = await Promise.all(
      sessionItems.map(async (session) => [session.id, await listPracticeTasks(session.id)] as const),
    )
    setPracticeTasksBySession(Object.fromEntries(taskEntries))
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
      setSelectedPracticeSessionId(session.id)
      setPracticeTaskForms((current) => ({
        ...current,
        [session.id]: createEmptyPracticeTaskForm(session.documents[0]?.id ?? ''),
      }))
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
      setSelectedPracticeSessionId((current) => (current === sessionId ? null : current))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '강의 세션 삭제에 실패했습니다.')
    }
  }

  async function handleGeneratePracticeTasks(session: LectureSession) {
    try {
      setGeneratingSessionId(session.id)
      setError(null)
      const form = practiceTaskForms[session.id] ?? createEmptyPracticeTaskForm(session.documents[0]?.id ?? '')
      const created = await generatePracticeTasks(session.id, form.document_id || session.documents[0]?.id)
      setPracticeTasksBySession((current) => ({
        ...current,
        [session.id]: [...created, ...(current[session.id] ?? [])],
      }))
      if (created[0]) {
        updatePracticeTaskForm(session.id, {
          document_id: created[0].document_id,
          page_number: String(created[0].page_number),
        })
        setSelectedPracticeSessionId(session.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '실습 후보 생성에 실패했습니다.')
    } finally {
      setGeneratingSessionId(null)
    }
  }

  async function handleApprovePracticeTask(task: PracticeTask) {
    if (!task.id || task.id === 'None') {
      setError('실습 후보 ID가 없어 승인할 수 없습니다. AI 초안을 다시 생성해주세요.')
      return
    }

    try {
      const updated = await updatePracticeTaskStatus(task.session_id, task.id, 'approved')
      setPracticeTasksBySession((current) => ({
        ...current,
        [task.session_id]: (current[task.session_id] ?? []).map((item) => (item.id === task.id ? updated : item)),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '실습 후보 승인에 실패했습니다.')
    }
  }

  async function handleDeletePracticeTask(task: PracticeTask) {
    if (!task.id || task.id === 'None') {
      setError('실습 후보 ID가 없어 삭제할 수 없습니다. 화면을 새로고침한 뒤 다시 시도해주세요.')
      return
    }

    try {
      await deletePracticeTask(task.session_id, task.id)
      setPracticeTasksBySession((current) => ({
        ...current,
        [task.session_id]: (current[task.session_id] ?? []).filter((item) => item.id !== task.id),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '실습 후보 삭제에 실패했습니다.')
    }
  }

  function updatePracticeTaskForm(sessionId: string, patch: Partial<PracticeTaskForm>) {
    setPracticeTaskForms((current) => ({
      ...current,
      [sessionId]: {
        ...(current[sessionId] ?? createEmptyPracticeTaskForm()),
        ...patch,
      },
    }))
  }

  function getPracticePreviewPages(form: PracticeTaskForm) {
    return documentPagesById[form.document_id] ?? []
  }

  function getPracticePageCount(form: PracticeTaskForm) {
    return documentPageCountsById[form.document_id] ?? documentPagesById[form.document_id]?.length ?? 0
  }

  const handlePracticePageCountLoaded = useCallback((documentId: string, pageCount: number) => {
    setDocumentPageCountsById((current) => ({ ...current, [documentId]: pageCount }))
  }, [])

  async function ensureDocumentPages(documentId: string) {
    if (!documentId || documentPagesById[documentId]) {
      return
    }
    try {
      const pages = await listDocumentPages(documentId)
      setDocumentPagesById((current) => ({ ...current, [documentId]: pages }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 페이지를 불러오지 못했습니다.')
    }
  }

  async function handleCreatePracticeTask(session: LectureSession) {
    const form = practiceTaskForms[session.id] ?? createEmptyPracticeTaskForm(session.documents[0]?.id ?? '')
    if (!form.document_id || !form.title.trim() || !form.command.trim()) {
      setError('실습을 추가하려면 문서, 제목, 명령어를 입력해주세요.')
      return
    }

    try {
      const created = await createPracticeTask(session.id, {
        document_id: form.document_id,
        page_number: Number(form.page_number) || 1,
        title: form.title,
        instruction: form.instruction || null,
        command: form.command,
        expected_output: form.expected_output || null,
        hint: form.hint || null,
        safety_note: form.safety_note || null,
        status: form.status,
      })
      setPracticeTasksBySession((current) => ({
        ...current,
        [session.id]: [created, ...(current[session.id] ?? [])],
      }))
      setPracticeTaskForms((current) => ({
        ...current,
        [session.id]: {
          ...createEmptyPracticeTaskForm(form.document_id),
          page_number: form.page_number,
        },
      }))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '실습 직접 추가에 실패했습니다.')
    }
  }

  useEffect(() => {
    Object.values(practiceTaskForms).forEach((form) => {
      if (form.document_id && !documentPagesById[form.document_id]) {
        void ensureDocumentPages(form.document_id)
      }
    })
  }, [practiceTaskForms, documentPagesById])

  async function handleAssistPracticeTask(session: LectureSession) {
    const form = practiceTaskForms[session.id] ?? createEmptyPracticeTaskForm(session.documents[0]?.id ?? '')
    if (!form.document_id || !form.command.trim()) {
      setError('AI 보완을 하려면 문서와 명령어를 먼저 입력해주세요.')
      return
    }

    try {
      setAssistingSessionId(session.id)
      setError(null)
      const assisted = await assistPracticeTask(session.id, {
        document_id: form.document_id,
        page_number: Number(form.page_number) || 1,
        command: form.command,
      })
      updatePracticeTaskForm(session.id, {
        title: assisted.title,
        instruction: assisted.instruction,
        expected_output: assisted.expected_output,
        hint: assisted.hint,
        safety_note: assisted.safety_note,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 실습 보완에 실패했습니다.')
    } finally {
      setAssistingSessionId(null)
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
              <SessionPracticeCard
                key={session.id}
                session={session}
                isGenerating={generatingSessionId === session.id}
                isSelected={selectedPracticeSession?.id === session.id}
                onGenerate={(item) => void handleGeneratePracticeTasks(item)}
                onSelect={(item) => setSelectedPracticeSessionId(item.id)}
                onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
              />
            ))}
          </div>
        </Card>
      </section>

      {selectedPracticeSession ? (
        <AdminPracticeWorkspace
          session={selectedPracticeSession}
          form={practiceTaskForms[selectedPracticeSession.id] ?? createEmptyPracticeTaskForm(selectedPracticeSession.documents[0]?.id ?? '')}
          tasks={practiceTasksBySession[selectedPracticeSession.id] ?? []}
          pages={getPracticePreviewPages(practiceTaskForms[selectedPracticeSession.id] ?? createEmptyPracticeTaskForm(selectedPracticeSession.documents[0]?.id ?? ''))}
          pageCount={getPracticePageCount(practiceTaskForms[selectedPracticeSession.id] ?? createEmptyPracticeTaskForm(selectedPracticeSession.documents[0]?.id ?? ''))}
          isGenerating={generatingSessionId === selectedPracticeSession.id}
          isAssisting={assistingSessionId === selectedPracticeSession.id}
          onGenerate={(item) => void handleGeneratePracticeTasks(item)}
          onFormChange={updatePracticeTaskForm}
          onAssistPracticeTask={(item) => void handleAssistPracticeTask(item)}
          onCreatePracticeTask={(item) => void handleCreatePracticeTask(item)}
          onApprovePracticeTask={(task) => void handleApprovePracticeTask(task)}
          onDeletePracticeTask={(task) => void handleDeletePracticeTask(task)}
          onPageCountLoaded={handlePracticePageCountLoaded}
        />
      ) : null}
    </main>
  )
}
