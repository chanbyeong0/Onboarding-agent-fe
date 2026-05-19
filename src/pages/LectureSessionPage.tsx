import { useEffect, useRef, useState } from 'react'
import MarkdownText from '../components/ui/MarkdownText'
import { Link, useParams } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { createCheckpoint, listMySessionCheckpoints } from '../features/checkpoints/api/checkpointApi'
import type { Checkpoint } from '../features/checkpoints/types'
import ChatPanel from '../features/chat/components/ChatPanel'
import { buildDocumentViewerPdfUrl, listDocumentPages } from '../features/documents/api/documentApi'
import PdfPageViewer from '../features/documents/components/PdfPageViewer'
import type { DocumentItem, DocumentPage } from '../features/documents/types'
import {
  createPageExplanation,
  fetchPageExplanationAudio,
  getLectureSession,
  updateLearningProgress,
} from '../features/lectureSessions/api/lectureSessionApi'
import type { LectureSession } from '../features/lectureSessions/types'

export default function LectureSessionPage() {
  const { sessionId = '' } = useParams()
  const [session, setSession] = useState<LectureSession | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const [pages, setPages] = useState<DocumentPage[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [currentPageNumber, setCurrentPageNumber] = useState(1)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [checkpointPage, setCheckpointPage] = useState('')
  const [checkpointContent, setCheckpointContent] = useState('')
  const [explanationText, setExplanationText] = useState('')
  const [explanationAudioUrl, setExplanationAudioUrl] = useState<string | null>(null)
  const [audioSource, setAudioSource] = useState<string | null>(null)
  const [isExplanationLoading, setIsExplanationLoading] = useState(false)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [isAudioBlocked, setIsAudioBlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioSourceRef = useRef<string | null>(null)
  const progressTimerRef = useRef<number>(Date.now())

  const viewerPdfUrl = selectedDocument ? buildDocumentViewerPdfUrl(selectedDocument.viewer_pdf_url) : null
  const knownTotalPageCount = pageCount || pages.length
  const totalPageCount = knownTotalPageCount || 1
  const isLastPage = currentPageNumber >= totalPageCount

  async function loadSession() {
    const [sessionData, checkpointItems] = await Promise.all([getLectureSession(sessionId), listMySessionCheckpoints(sessionId)])
    const lastDocument = sessionData.documents.find((document) => document.id === sessionData.progress?.last_document_id)
    setSession(sessionData)
    setSelectedDocument((current) => current ?? lastDocument ?? sessionData.documents[0] ?? null)
    setCurrentPageNumber(lastDocument && sessionData.progress?.last_page_number ? sessionData.progress.last_page_number : 1)
    setCheckpoints(checkpointItems)
  }

  useEffect(() => {
    void loadSession().catch((err) => setError(err instanceof Error ? err.message : '강의 세션을 불러오지 못했습니다.'))
  }, [sessionId])

  function handleSelectDocument(document: DocumentItem) {
    setSelectedDocument(document)
    setCurrentPageNumber(1)
    setPageCount(0)
  }

  useEffect(() => {
    if (!selectedDocument) {
      setPages([])
      setCurrentPageNumber(1)
      setPageCount(0)
      return
    }

    void listDocumentPages(selectedDocument.id)
      .then((pageItems) => {
        setPages(pageItems)
        setCurrentPageNumber((page) => Math.min(page, pageItems.length || 1))
      })
      .catch((err) => setError(err instanceof Error ? err.message : '슬라이드 페이지를 불러오지 못했습니다.'))
  }, [selectedDocument])

  useEffect(() => {
    if (!selectedDocument || knownTotalPageCount <= 0) {
      return
    }

    const now = Date.now()
    const studySecondsDelta = Math.max(0, Math.round((now - progressTimerRef.current) / 1000))
    progressTimerRef.current = now

    void updateLearningProgress(sessionId, {
      document_id: selectedDocument.id,
      page_number: currentPageNumber,
      total_pages: knownTotalPageCount,
      study_seconds_delta: studySecondsDelta,
    })
      .then((progress) => {
        setSession((current) => (current ? { ...current, progress } : current))
      })
      .catch((err) => setError(err instanceof Error ? err.message : '학습 진행도 저장에 실패했습니다.'))
  }, [selectedDocument, currentPageNumber, knownTotalPageCount, sessionId])

  useEffect(() => {
    if (!selectedDocument) {
      return
    }

    let ignore = false
    audioRef.current?.pause()
    if (audioSourceRef.current) {
      URL.revokeObjectURL(audioSourceRef.current)
      audioSourceRef.current = null
    }
    setExplanationText('')
    setExplanationAudioUrl(null)
    setAudioSource(null)
    setIsAudioBlocked(false)
    setIsExplanationLoading(true)

    void createPageExplanation(sessionId, {
      document_id: selectedDocument.id,
      page_number: currentPageNumber,
      checkpoints: checkpoints.map((checkpoint) => checkpoint.content),
    })
      .then((pageExplanation) => {
        if (ignore) {
          return
        }
        setExplanationText(pageExplanation.text)
        setExplanationAudioUrl(pageExplanation.audio_url)
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : '페이지 해설을 생성하지 못했습니다.')
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsExplanationLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedDocument, currentPageNumber, sessionId, checkpoints])

  useEffect(() => {
    if (!explanationAudioUrl) {
      return
    }

    let blobUrl: string | null = null
    setIsAudioLoading(true)
    void fetchPageExplanationAudio(explanationAudioUrl)
      .then((audioBlob) => {
        blobUrl = URL.createObjectURL(audioBlob)
        audioSourceRef.current = blobUrl
        setAudioSource(blobUrl)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '해설 음성을 불러오지 못했습니다.'))
      .finally(() => setIsAudioLoading(false))

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [explanationAudioUrl])

  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        URL.revokeObjectURL(audioSourceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!audioSource || !audioRef.current) {
      return
    }

    audioRef.current.load()
    void audioRef.current.play().catch(() => setIsAudioBlocked(true))
  }, [audioSource])

  async function handleAddCheckpoint() {
    if (!selectedDocument || !checkpointContent.trim()) {
      return
    }

    try {
      const created = await createCheckpoint({
        session_id: sessionId,
        document_id: selectedDocument.id,
        page_number: checkpointPage ? Number(checkpointPage) : currentPageNumber,
        content: checkpointContent,
      })
      setCheckpoints((current) => [created, ...current])
      setCheckpointContent('')
      setCheckpointPage('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '체크포인트 저장에 실패했습니다.')
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <BrandMark compact />
          <p className="eyebrow">Lecture Session</p>
          <h1 className="title">{session?.title ?? '강의 세션'}</h1>
          <p className="subtitle">{session?.description ?? '슬라이드를 넘기며 AI 사수의 설명을 확인하세요.'}</p>
        </div>
        <Link className="link-button" to="/dashboard">
          대시보드
        </Link>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="slide-player-grid">
        <div className="stack">
          <Card className="stack">
            <div>
              <p className="eyebrow">Materials</p>
              <h2 style={{ margin: 0 }}>강의 문서</h2>
            </div>
            {session?.documents.map((document) => (
              <button
                key={document.id}
                type="button"
                className="select-card"
                data-selected={selectedDocument?.id === document.id}
                onClick={() => handleSelectDocument(document)}
              >
                <strong>{document.title}</strong>
                <span>{document.file_type.toUpperCase()}</span>
              </button>
            ))}
          </Card>
        </div>

        <Card tone="strong" className="stack">
          <div>
            <p className="eyebrow">Slide</p>
            <h2 style={{ margin: 0 }}>{selectedDocument?.title ?? '문서를 선택하세요'}</h2>
            <p className="muted">
              {selectedDocument ? `${currentPageNumber} / ${totalPageCount} 페이지` : '페이지를 준비 중입니다.'}
            </p>
          </div>
          <div className="slide-canvas">
            {viewerPdfUrl ? (
              <PdfPageViewer fileUrl={viewerPdfUrl} pageNumber={currentPageNumber} onLoaded={setPageCount} />
            ) : (
              <span className="muted">표시할 PDF가 없습니다.</span>
            )}
          </div>
          <div className="slide-controls">
            <Button type="button" variant="secondary" disabled={currentPageNumber <= 1} onClick={() => setCurrentPageNumber((page) => page - 1)}>
              이전
            </Button>
            {isLastPage ? (
              <Link className="link-button" to={`/sessions/${sessionId}/exam`}>
                시험 보러가기
              </Link>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentPageNumber((page) => page + 1)}
              >
                다음
              </Button>
            )}
          </div>
        </Card>

        <div className="stack lecture-side-panel">
          <Card className="stack">
            <div>
              <p className="eyebrow">AI Explanation</p>
              <h2 style={{ margin: 0 }}>페이지 해설</h2>
            </div>
            <div className="ai-output">
              {explanationText
                ? <MarkdownText>{explanationText}</MarkdownText>
                : <span className="muted">{isExplanationLoading ? 'AI 사수가 설명과 음성을 준비 중입니다.' : '페이지를 선택하세요.'}</span>}
            </div>
            {audioSource ? (
              <div className="audio-player">
                <audio ref={audioRef} controls autoPlay src={audioSource} />
                {isAudioBlocked ? (
                  <Button type="button" variant="primary" onClick={() => { setIsAudioBlocked(false); void audioRef.current?.play() }}>
                    ▶ 음성 재생
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="muted">{isExplanationLoading || isAudioLoading ? '음성 준비 중입니다.' : '음성 파일이 아직 없습니다.'}</p>
            )}
          </Card>

          <Card className="stack">
          <div>
            <p className="eyebrow">Checkpoint</p>
            <h2 style={{ margin: 0 }}>어려운 부분 기록</h2>
          </div>
          <input
            className="ui-input"
            placeholder="페이지 번호(선택)"
            value={checkpointPage}
            onChange={(event) => setCheckpointPage(event.target.value)}
          />
          <textarea
            className="ui-input"
            placeholder="강의 중 어려웠던 부분을 입력하세요"
            rows={5}
            value={checkpointContent}
            onChange={(event) => setCheckpointContent(event.target.value)}
          />
          <Button type="button" disabled={!selectedDocument} onClick={() => void handleAddCheckpoint()}>
            체크포인트 저장
          </Button>
          <div className="stack">
            {checkpoints.map((checkpoint) => (
              <div key={checkpoint.id} className="select-card">
                <strong>{checkpoint.content}</strong>
                <span className="muted">page {checkpoint.page_number ?? '-'}</span>
              </div>
            ))}
          </div>
          </Card>

          <ChatPanel sessionId={sessionId} selectedDocument={selectedDocument} currentPageNumber={currentPageNumber} checkpoints={checkpoints} />
        </div>
      </section>
    </main>
  )
}
