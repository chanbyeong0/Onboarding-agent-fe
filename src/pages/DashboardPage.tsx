import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { getLearningSummary } from '../features/lectureSessions/api/lectureSessionApi'
import type { LearningSummary } from '../features/lectureSessions/types'
import { useAuthStore } from '../stores/authStore'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [summary, setSummary] = useState<LearningSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadSummary() {
    try {
      setSummary(await getLearningSummary())
    } catch (err) {
      setError(err instanceof Error ? err.message : '학습 현황을 불러오지 못했습니다.')
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <BrandMark compact />
          <p className="eyebrow">Dashboard</p>
          <h1 className="title">학습 현황</h1>
        </div>
        <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
          <span className="muted">{user?.name ?? '사용자'}님</span>
          <Button variant="secondary" onClick={() => void logout()}>
            로그아웃
          </Button>
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="summary-grid">
        <Card tone="strong">
          <p className="eyebrow">Completion</p>
          <h2 className="metric">{summary?.completion_rate ?? 0}%</h2>
          <p className="muted">
            {summary?.completed_documents ?? 0}/{summary?.total_documents ?? 0}개 문서 학습 완료
          </p>
        </Card>
        <Card>
          <p className="eyebrow">Checkpoints</p>
          <h2 className="metric">{summary?.checkpoint_count ?? 0}</h2>
          <p className="muted">강의 중 어려웠던 부분 기록</p>
        </Card>
        <Card>
          <p className="eyebrow">AI Questions</p>
          <h2 className="metric">{summary?.question_count ?? 0}</h2>
          <p className="muted">AI 사수에게 남긴 질문</p>
        </Card>
      </section>

      <section className="stack" style={{ marginTop: 24 }}>
        <div>
          <p className="eyebrow">Sessions</p>
          <h2 style={{ margin: 0 }}>강의</h2>
        </div>
        {summary?.sessions.length === 0 ? <Card className="muted">아직 준비된 강의 세션이 없습니다.</Card> : null}
        {summary?.sessions.map((session) => (
          <Card key={session.id} className="session-row">
            <div>
              <h3 style={{ margin: 0 }}>{session.title}</h3>
              <p className="muted">{session.description || `${session.documents.length}개 문서로 구성된 강의입니다.`}</p>
            </div>
            <div className="session-actions">
              <Link className="link-button" to={`/sessions/${session.id}`}>
                강의 입장
              </Link>
              <Link className="link-button" to={`/sessions/${session.id}/exam`}>
                시험
              </Link>
            </div>
          </Card>
        ))}
      </section>
    </main>
  )
}
