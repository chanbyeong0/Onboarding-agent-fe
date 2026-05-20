import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import mentorImage from '../assets/image.png'
import { synthesizeChatTts } from '../features/chat/api/chatApi'
import { useAuthStore } from '../stores/authStore'

const WEEKLY_TASKS = [
  {
    day: '월',
    title: '청소와 MAGO 소개',
    meta: '사무실 청소 루틴과 MAGO가 어떤 팀인지 먼저 익힙니다.',
    status: '완료',
  },
  {
    day: '화',
    title: '휴가 정책과 사람 이름 외우기',
    meta: '휴가 사용 방식과 함께 일할 동료들의 이름을 익힙니다.',
    status: '완료',
  },
  {
    day: '수',
    title: '세미나 의견 나누기',
    meta: '세미나를 진행하면서 다양한 주제에 대해 의견을 나눠봅니다.',
    status: '오늘',
  },
  {
    day: '목',
    title: '위클리와 업무 진행 점검',
    meta: '위클리 내용을 정리하고 진행 상황을 점검합니다.',
    status: '예정',
    href: '/weekly-workshop',
  },
  {
    day: '금',
    title: '재택과 마무리 퀴즈',
    meta: '일주일 업무를 정리하고 마지막 사람이 내는 퀴즈를 풀어봅니다.',
    status: '예정',
  },
]

const SCHEDULE_DAYS = [
  { date: 18, day: '월' },
  { date: 19, day: '화' },
  { date: 20, day: '수', isToday: true },
  { date: 21, day: '목', isWeekly: true },
  { date: 22, day: '금' },
]

const SCHEDULE_TIMES = ['10:00', '11:00', '14:00']

const SCHEDULE_EVENTS = [
  { dayIndex: 0, timeIndex: 0, title: 'daily standup 작성, 청소', tone: 'blue' },
  { dayIndex: 0, timeIndex: 1, title: '하이라디오 개발: 터미널 서버 접속', tone: 'red' },
  { dayIndex: 0, timeIndex: 2, title: '연차 신청', tone: 'pink' },
  { dayIndex: 1, timeIndex: 2, title: '연차', tone: 'pink' },
  { dayIndex: 2, timeIndex: 0, title: 'daily standup 작성', tone: 'blue' },
  { dayIndex: 2, timeIndex: 1, title: '하이라디오 개발: GitHub', tone: 'red' },
  { dayIndex: 2, timeIndex: 2, title: '세미나', tone: 'green' },
  { dayIndex: 3, timeIndex: 0, title: 'daily standup 작성', tone: 'blue' },
  { dayIndex: 3, timeIndex: 1, title: 'Docker 프로젝트 환경 세팅', tone: 'red' },
  { dayIndex: 3, timeIndex: 2, title: '위클리', tone: 'purple', href: '/weekly-workshop' },
  { dayIndex: 4, timeIndex: 0, title: '재택 daily standup', tone: 'blue' },
  { dayIndex: 4, timeIndex: 1, title: '하이라디오 개발 정리', tone: 'red' },
  { dayIndex: 4, timeIndex: 2, title: '마무리 퀴즈', tone: 'green' },
]

const SEAT_ROWS = [
  [
    { id: 'A1', name: '찬병', team: 'DEV', isMe: true },
    { id: 'A2', name: '현욱', team: 'DEV' },
    { id: 'A3', name: '도희', team: '기획' },
    { id: 'A4', name: '', team: '' },
  ],
  [
    { id: 'B1', name: '나영', team: 'PM' },
    { id: 'B2', name: '효정', team: 'PM' },
    { id: 'B3', name: '수진', team: 'AI' },
    { id: 'B4', name: '다혜', team: '기획' },
  ],
  [
    { id: 'C1', name: '갈로아', team: 'CTO' },
    { id: 'C2', name: '현웅님', team: 'CEO' },
  ],
]

export default function OfficeHomePage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const userName = user?.name ?? '신입'
  const [now, setNow] = useState(() => new Date())
  const [briefingDateTime] = useState(() => new Date())
  const [captionIndex, setCaptionIndex] = useState(0)
  const [isBriefingBlocked, setIsBriefingBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const playbackIdRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const formattedDateTime = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now),
    [now],
  )

  const briefingDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(briefingDateTime),
    [briefingDateTime],
  )

  const todayBriefing = useMemo(() => {
    const day = briefingDateTime.getDay()

    if (day === 1) {
      return '오늘은 청소 루틴과 MAGO 소개를 익히면서 사무실 분위기에 적응해볼 거예요.'
    }

    if (day === 2) {
      return '오늘은 휴가 정책을 살펴보고, 함께 일할 동료들의 이름을 하나씩 익혀봅니다.'
    }

    if (day === 3) {
      return '오늘은 세미나를 진행하면서 다양한 부분에 대해 의견을 나눠보아요.'
    }

    if (day === 4) {
      return '오늘은 위클리를 진행합니다. 노션의 팀 스페이스, Developers, Meetings에서 내용을 정리하고 업무 진행 상황을 점검합니다.'
    }

    if (day === 5) {
      return '오늘은 재택 업무 흐름을 경험하고, 마지막에는 퀴즈를 풀며 한 주를 마무리합니다.'
    }

    return '오늘은 이번 주 온보딩 내용을 천천히 복습해보면 좋겠습니다.'
  }, [briefingDateTime])

  const briefingLines = useMemo(
    () => [
      `${userName}님, 안녕하세요. 저는 ${userName}님의 업무 적응을 도와주는 AI 사수입니다.`,
      '저랑 함께 가상 환경에서 일주일 동안 회사 업무를 진행해보아요.',
      todayBriefing,
    ],
    [briefingDateLabel, todayBriefing, userName],
  )

  function stopBriefing() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    audioRef.current.onended = null
    audioRef.current.onerror = null
    audioRef.current.pause()
    audioRef.current.removeAttribute('src')
    audioRef.current.load()
  }

  async function playBriefingLine(index: number, playbackId: number) {
    stopBriefing()
    setCaptionIndex(index)
    setIsBriefingBlocked(false)

    try {
      const audioBlob = await synthesizeChatTts(briefingLines[index])
      if (playbackId !== playbackIdRef.current) {
        return
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = audioRef.current
      audio.src = audioUrl
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)

        if (playbackId !== playbackIdRef.current) {
          return
        }

        if (index < briefingLines.length - 1) {
          timerRef.current = window.setTimeout(() => {
            void playBriefingLine(index + 1, playbackId)
          }, 420)
        }
      }
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        setIsBriefingBlocked(true)
      }

      await audio.play()
    } catch {
      setIsBriefingBlocked(true)
    }
  }

  function startBriefing() {
    const playbackId = playbackIdRef.current + 1
    playbackIdRef.current = playbackId
    void playBriefingLine(0, playbackId)
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    startBriefing()

    return () => {
      playbackIdRef.current += 1
      stopBriefing()
    }
  }, [briefingLines])

  return (
    <div className="office-page">
      <header className="office-topbar">
        <BrandMark compact />
        <div className="office-topbar__right">
          <span>{user?.name ?? '사용자'}님</span>
          <Button variant="secondary" onClick={() => void logout()}>
            로그아웃
          </Button>
        </div>
      </header>

      <main className="office-main">
        <section className="office-hero">
          <p className="office-label">MAGO Office</p>
          <div className="office-briefing">
            <div className="office-mentor-avatar" aria-hidden="true">
              <img alt="" src={mentorImage} />
            </div>
            <div className="office-script-row">
              <div className="office-script-card" key={captionIndex}>
                <div className="office-script-meta">
                  <span>AI사수</span>
                </div>
                <p>{briefingLines[captionIndex]}</p>
              </div>
              <time className="office-script-time" dateTime={now.toISOString()}>
                <span>현재 시간</span>
                <strong>{formattedDateTime}</strong>
              </time>
            </div>
          </div>
          <p>AI사수가 자리, 일정, 이번 주 해야 할 일을 말로 설명하고 자막으로 보여줍니다.</p>
          <div className="office-hero-actions">
            <Link className="office-primary-link" to="/dashboard">
              공부하러가기
            </Link>
            {isBriefingBlocked ? (
              <button className="office-secondary-link" onClick={startBriefing} type="button">
                음성 브리핑 듣기
              </button>
            ) : null}
            {user?.role === 'admin' ? (
              <Link className="office-secondary-link" to="/admin">
                관리자 페이지
              </Link>
            ) : null}
          </div>
        </section>

        <section className="office-grid" aria-label="온보딩 사무실 대시보드">
          <article className="office-card office-seat-card">
            <div>
              <p className="office-label">Office Map</p>
              <h2>사무실 자리 배치</h2>
              <p className="office-muted">실제 근무하는 사무실 기준으로 자리와 역할을 한눈에 볼 수 있어요.</p>
            </div>
            <div className="office-map">
              <div className="office-room-label">MAGO HQ · 3F</div>
              <div className="office-seat-rows">
                {SEAT_ROWS.map((row, rowIndex) => (
                  <div className="office-seat-row" key={`row-${rowIndex}`}>
                    {row.map((seat) => (
                      <div className="office-seat" data-me={seat.isMe} key={seat.id}>
                        <span>{seat.id}</span>
                        <strong>{seat.isMe ? user?.name ?? seat.name : seat.name}</strong>
                        <small>{seat.team}</small>
                        {seat.isMe ? (
                          <div className="office-seat-tooltip">
                            <img alt="" src={mentorImage} />
                            <p>안녕 난 백엔드 개발자 박찬병이야. Docker가 궁금하면 나에게로 와.</p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="office-card office-task-card">
            <div>
              <p className="office-label">This Week</p>
              <h2>이번주 할일</h2>
            </div>
            <div className="office-task-list">
              {WEEKLY_TASKS.map((task) => {
                const content = (
                  <div>
                    <span>{task.day}요일</span>
                    <strong>{task.title}</strong>
                    <span>{task.meta}</span>
                  </div>
                )

                return task.href ? (
                  <Link className="office-task-item office-task-item--link" key={task.title} to={task.href}>
                    {content}
                    <em>위클리 보기</em>
                  </Link>
                ) : (
                  <div className="office-task-item" key={task.title}>
                    {content}
                    <em>{task.status}</em>
                  </div>
                )
              })}
            </div>
          </article>

          <article className="office-card office-calendar-card">
            <div>
              <p className="office-label">Calendar</p>
              <h2>캘린더 · 이번 주</h2>
            </div>
            <div className="office-calendar">
              <div className="office-calendar-header">
                <strong>이번 주 일정</strong>
                <span>목요일 위클리</span>
              </div>
              <div className="office-schedule">
                <div className="office-schedule-corner" aria-hidden="true" />
                {SCHEDULE_DAYS.map((item) => (
                  <div
                    className="office-schedule-day"
                    data-today={item.isToday}
                    data-weekly={item.isWeekly}
                    key={`${item.date}-${item.day}`}
                  >
                    <strong>{item.date}일({item.day})</strong>
                    {item.isToday ? <span>오늘</span> : null}
                  </div>
                ))}

                {SCHEDULE_TIMES.map((time, timeIndex) => (
                  <Fragment key={`row-${time}`}>
                    <div className="office-schedule-time" key={`time-${time}`}>
                      {time}
                    </div>
                    {SCHEDULE_DAYS.map((day, dayIndex) => {
                      const event = SCHEDULE_EVENTS.find((item) => item.dayIndex === dayIndex && item.timeIndex === timeIndex)
                      if (!event) {
                        return <div className="office-schedule-cell" key={`${day.date}-${time}`} />
                      }

                      return event.href ? (
                        <Link
                          className="office-schedule-event"
                          data-tone={event.tone}
                          key={`${day.date}-${time}`}
                          to={event.href}
                        >
                          {event.title}
                        </Link>
                      ) : (
                        <div className="office-schedule-event" data-tone={event.tone} key={`${day.date}-${time}`}>
                          {event.title}
                        </div>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
