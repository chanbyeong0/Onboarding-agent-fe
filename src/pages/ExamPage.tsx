import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { createExam, getLatestExam, submitExam } from '../features/exams/api/examApi'
import type { ExamAttempt } from '../features/exams/types'
import { getLectureSession } from '../features/lectureSessions/api/lectureSessionApi'
import type { LectureSession } from '../features/lectureSessions/types'

export default function ExamPage() {
  const { sessionId = '' } = useParams()
  const [session, setSession] = useState<LectureSession | null>(null)
  const [exam, setExam] = useState<ExamAttempt | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSubmitted = Boolean(exam?.submitted_at)
  const isComplete = useMemo(() => {
    if (!exam) {
      return false
    }
    return exam.questions.every((_, questionIndex) => selectedAnswers[questionIndex] !== undefined)
  }, [exam, selectedAnswers])

  useEffect(() => {
    async function loadExam() {
      try {
        const [sessionData, latestExam] = await Promise.all([getLectureSession(sessionId), getLatestExam(sessionId)])
        setSession(sessionData)
        setExam(latestExam)
        if (latestExam?.answers.length) {
          setSelectedAnswers(
            Object.fromEntries(latestExam.answers.map((answer) => [answer.question_index, answer.selected_option_index])),
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '시험 정보를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadExam()
  }, [sessionId])

  async function handleCreateExam() {
    try {
      setIsGenerating(true)
      setError(null)
      const created = await createExam(sessionId)
      setExam(created)
      setSelectedAnswers({})
    } catch (err) {
      setError(err instanceof Error ? err.message : '시험 문제를 생성하지 못했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSubmitExam() {
    if (!exam || !isComplete) {
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const submitted = await submitExam(sessionId, exam.id, {
        answers: exam.questions.map((_, questionIndex) => ({
          question_index: questionIndex,
          selected_option_index: selectedAnswers[questionIndex],
        })),
      })
      setExam(submitted)
    } catch (err) {
      setError(err instanceof Error ? err.message : '시험 답안을 제출하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <BrandMark compact />
          <p className="eyebrow">Exam</p>
          <h1 className="title">강의 내용 기반 시험</h1>
          <p className="subtitle">{session?.title ?? '강의'}의 핵심 내용을 객관식으로 확인합니다.</p>
        </div>
        <Link className="link-button" to="/dashboard">
          대시보드
        </Link>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="stack" style={{ marginTop: 24 }}>
        {!exam ? (
          <Card className="stack">
            <div>
              <p className="eyebrow">Generate</p>
              <h2 style={{ margin: 0 }}>시험 생성</h2>
            </div>
            <p className="muted">
              강의 자료, 체크포인트, AI 질문 기록을 바탕으로 LLM이 객관식 5문항을 생성합니다.
            </p>
            <Button type="button" disabled={isLoading || isGenerating} onClick={() => void handleCreateExam()}>
              {isGenerating ? '시험 생성 중...' : '시험 시작'}
            </Button>
          </Card>
        ) : (
          <>
            <Card tone="strong" className="exam-summary">
              <div>
                <p className="eyebrow">Result</p>
                <h2 style={{ margin: 0 }}>{isSubmitted ? `${exam.score ?? 0}점` : '응시 중'}</h2>
                <p className="muted">{isSubmitted ? '제출이 완료되었습니다.' : '모든 문항을 선택한 뒤 제출하세요.'}</p>
              </div>
              {!isSubmitted ? (
                <Button type="button" variant="secondary" disabled={isGenerating || isSubmitting} onClick={() => void handleCreateExam()}>
                  {isGenerating ? '재생성 중...' : '문제 다시 생성'}
                </Button>
              ) : null}
            </Card>

            {exam.questions.map((question, questionIndex) => {
              const result = exam.answers.find((answer) => answer.question_index === questionIndex)
              return (
                <Card key={`${exam.id}-${questionIndex}`} className="stack">
                  <div>
                    <p className="eyebrow">Question {questionIndex + 1}</p>
                    <h3 style={{ margin: 0 }}>{question.question}</h3>
                    {question.source_hint ? <p className="muted">{question.source_hint}</p> : null}
                  </div>
                  <div className="exam-options">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selectedAnswers[questionIndex] === optionIndex
                      const isCorrect = result?.correct_option_index === optionIndex
                      return (
                        <button
                          key={option}
                          type="button"
                          className="select-card"
                          data-selected={isSelected}
                          data-correct={isSubmitted && isCorrect ? 'true' : undefined}
                          disabled={isSubmitted}
                          onClick={() => setSelectedAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                        >
                          <strong>{optionIndex + 1}. {option}</strong>
                          {isSubmitted && isSelected ? (
                            <span className={result?.is_correct ? 'success-text' : 'error-text'}>
                              {result?.is_correct ? '내 답안: 정답' : '내 답안: 오답'}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                  {isSubmitted ? <p className="muted">{question.explanation}</p> : null}
                </Card>
              )
            })}

            {!isSubmitted ? (
              <Button type="button" disabled={!isComplete || isSubmitting} onClick={() => void handleSubmitExam()}>
                {isSubmitting ? '제출 중...' : '답안 제출'}
              </Button>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}
