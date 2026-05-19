import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import { getLearningSummary } from '../features/lectureSessions/api/lectureSessionApi'
import type { LearningSummary, LectureSession } from '../features/lectureSessions/types'
import { useAuthStore } from '../stores/authStore'

const CATEGORIES = ['전체', '인프라', '개발', '클라우드', '보안', '사내문서'] as const

const LEVEL_COLOR: Record<string, { bg: string; text: string }> = {
  입문: { bg: '#e8f5e9', text: '#2e7d32' },
  초급: { bg: '#e3f2fd', text: '#1565c0' },
  중급: { bg: '#fff3e0', text: '#e65100' },
  고급: { bg: '#fce4ec', text: '#880e4f' },
}

const CAT_COLOR: Record<string, { bg: string; text: string }> = {
  인프라: { bg: '#e8eaf6', text: '#283593' },
  개발: { bg: '#e0f7fa', text: '#006064' },
  클라우드: { bg: '#ede7f6', text: '#4527a0' },
  보안: { bg: '#fbe9e7', text: '#bf360c' },
  사내문서: { bg: '#f3e8ff', text: '#6b21a8' },
}

function estimateMinutes(pageCount: number) {
  return Math.max(10, Math.ceil(pageCount * 1.75 / 5) * 5)
}

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}초`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [summary, setSummary] = useState<LearningSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('전체')
  const [search, setSearch] = useState('')

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

  const courses = useMemo(
    () =>
      (summary?.sessions ?? []).map((session) => {
        const pageCount = session.documents.length

        return {
          ...session,
          pageCount: session.progress?.total_pages || pageCount,
          estimatedMinutes: estimateMinutes(pageCount || session.document_ids.length),
          progressPct: Math.round(session.progress?.progress_rate ?? 0),
        }
      }),
    [summary?.sessions],
  )

  const scopedCourses = activeCategory === '전체' ? courses : courses.filter((course) => course.category === activeCategory)

  const filteredCourses = scopedCourses.filter((course) => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return true

    return (
      course.title.toLowerCase().includes(keyword) ||
      course.category.toLowerCase().includes(keyword) ||
      course.level.toLowerCase().includes(keyword) ||
      (course.description ?? '').toLowerCase().includes(keyword)
    )
  })

  const totalItems =
    activeCategory === '전체'
      ? (summary?.total_documents ?? 0)
      : scopedCourses.reduce((total, course) => total + (course.progress?.total_pages ?? Math.max(course.pageCount, course.document_ids.length)), 0)
  const completedItems =
    activeCategory === '전체'
      ? (summary?.completed_documents ?? 0)
      : scopedCourses.reduce((total, course) => total + (course.progress?.completed_pages ?? 0), 0)
  const completionPct = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100)
  const completionUnit = activeCategory === '전체' ? '문서' : '페이지'
  const totalSeconds =
    activeCategory === '전체'
      ? (summary?.study_seconds ?? 0)
      : scopedCourses.reduce((total, course) => total + (course.progress?.study_seconds ?? 0), 0)

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-logo">
          <BrandMark compact />
        </div>
        <div className="dashboard-topbar__right">
          <span className="dashboard-username">{user?.name ?? '사용자'}님</span>
          <Button variant="secondary" onClick={() => void logout()}>
            로그아웃
          </Button>
        </div>
      </header>

      <main className="dashboard-main">
        <p className="dashboard-label">Dashboard</p>
        <h1 className="dashboard-title">학습 현황</h1>

        <div className="dashboard-tabs" role="tablist" aria-label="강의 카테고리">
          {CATEGORIES.map((category) => (
            <button
              className="dashboard-tab"
              data-active={activeCategory === category}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <section className="dashboard-stats" aria-label="학습 요약">
          <div className="dashboard-stat-card">
            <p className="dashboard-stat-label">Completion</p>
            <p className="dashboard-stat-value">{completionPct}%</p>
            <p className="dashboard-stat-desc">
              {completedItems}/{totalItems}개 {completionUnit} 학습 완료
            </p>
          </div>
          <div className="dashboard-stat-card">
            <p className="dashboard-stat-label">Time</p>
            <p className="dashboard-stat-value">{formatSeconds(totalSeconds)}</p>
            <p className="dashboard-stat-desc">총 학습 시간</p>
          </div>
        </section>

        <label className="dashboard-search">
          <span aria-hidden="true">🔍</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="강의 제목, 카테고리 검색..."
            type="search"
            value={search}
          />
        </label>

        <section className="dashboard-sessions">
          <p className="dashboard-label">Sessions</p>
          <h2 className="dashboard-subtitle">강의</h2>

          <div className="dashboard-course-list">
            {filteredCourses.length === 0 ? <p className="dashboard-empty">검색 결과가 없습니다.</p> : null}
            {filteredCourses.map((course) => {
              const catColor = CAT_COLOR[course.category] ?? { bg: '#f5f5f5', text: '#333333' }
              const levelColor = LEVEL_COLOR[course.level] ?? { bg: '#f5f5f5', text: '#333333' }
              const pageCount = Math.max(course.pageCount, course.document_ids.length)
              const canTakeExam = course.progress?.progress_rate === 100

              return (
                <article className="dashboard-course-card" key={course.id}>
                  <div className="dashboard-course-info">
                    <div className="dashboard-badges">
                      <span className="dashboard-badge" style={{ background: catColor.bg, color: catColor.text }}>
                        {course.category}
                      </span>
                      <span className="dashboard-badge" style={{ background: levelColor.bg, color: levelColor.text }}>
                        {course.level}
                      </span>
                    </div>

                    <h3 className="dashboard-course-title">{course.title}</h3>
                    <p className="dashboard-course-desc">
                      {course.description || `${pageCount}개 문서로 구성된 강의입니다.`}
                    </p>

                    <div className="dashboard-progress">
                      <div className="dashboard-progress__track">
                        <div className="dashboard-progress__fill" style={{ width: `${course.progressPct}%` }} />
                      </div>
                      <span>{course.progressPct}%</span>
                    </div>

                    <div className="dashboard-meta">
                      <span>📄 {pageCount}페이지</span>
                      <span>⏱ {formatSeconds(course.progress?.study_seconds ?? 0)} 학습</span>
                      <span>🚩 어려운 점 {summary?.checkpoint_count ?? 0}</span>
                      <span>💬 AI 질문 {summary?.question_count ?? 0}</span>
                    </div>
                  </div>

                  <div className="dashboard-course-actions">
                    <Link className="dashboard-primary-link" to={`/sessions/${course.id}`}>
                      학습하기
                    </Link>
                    {canTakeExam ? (
                      <Link className="dashboard-secondary-link" to={`/sessions/${course.id}/exam`}>
                        시험 보기
                      </Link>
                    ) : (
                      <span className="dashboard-secondary-link dashboard-secondary-link--disabled">시험 보기</span>
                    )}
                    <span className="dashboard-score">{canTakeExam ? '시험 가능' : '학습 완료 후 응시'}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
