import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import { synthesizeChatTts } from '../features/chat/api/chatApi'
import { useAuthStore } from '../stores/authStore'

type WelcomeSlide = {
  title: string
  description: string
  cues: string[]
}

export default function WelcomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hasStarted, setHasStarted] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [activeCueIndex, setActiveCueIndex] = useState(0)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const audioCacheRef = useRef(new Map<string, string>())
  const playbackIdRef = useRef(0)
  const lastRequestedIndexRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const userName = user?.name ?? '신입'

  const slides = useMemo<WelcomeSlide[]>(
    () => [
      {
        title: `안녕하세요, ${userName}님`,
        description: '새로운 시작을 진심으로 환영해요. 저는 회사 생활과 온보딩 여정을 함께 안내할 AI사수입니다.',
        cues: [`안녕하세요, ${userName}님.`, '새로운 시작을 진심으로 환영해요.', '저는 회사 생활과 온보딩 여정을 함께 안내할 AI사수입니다.'],
      },
      {
        title: '처음이라 낯설어도 괜찮아요',
        description: '업무 방식, 사내 용어, 필요한 문서까지 하나씩 익숙해질 수 있도록 곁에서 도와드릴게요.',
        cues: ['처음이라 낯설어도 괜찮아요.', '업무 방식, 사내 용어, 필요한 문서까지.', '하나씩 익숙해질 수 있도록 곁에서 도와드릴게요.'],
      },
      {
        title: '이제 함께 시작해볼까요',
        description: '필요한 순간에 질문하고, 천천히 배워가면 됩니다. 오늘부터 저는 당신의 가장 가까운 온보딩 파트너예요.',
        cues: ['이제 함께 시작해볼까요.', '필요한 순간에 질문하고, 천천히 배워가면 됩니다.', '오늘부터 저는 당신의 가장 가까운 온보딩 파트너예요.'],
      },
    ],
    [userName],
  )

  const activeSlide = slides[activeIndex]
  const activeCue = activeSlide.cues[activeCueIndex] ?? activeSlide.cues[0]
  function stopCurrentAudio() {
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

  function enterOffice() {
    playbackIdRef.current += 1
    lastRequestedIndexRef.current = null
    stopCurrentAudio()
    navigate('/office', { replace: true })
  }

  function scheduleNext(callback: () => void, delay: number) {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      callback()
    }, delay)
  }

  function getCueKey(index: number, cueIndex: number) {
    return `${index}:${cueIndex}`
  }

  async function getAudioUrl(index: number, cueIndex: number) {
    const key = getCueKey(index, cueIndex)
    const cachedUrl = audioCacheRef.current.get(key)
    if (cachedUrl) {
      return cachedUrl
    }

    const audioBlob = await synthesizeChatTts(slides[index].cues[cueIndex])
    const audioUrl = URL.createObjectURL(audioBlob)
    audioCacheRef.current.set(key, audioUrl)
    return audioUrl
  }

  function preloadUpcomingAudio(index: number, cueIndex: number) {
    const nextCueIndex = cueIndex + 1
    const nextSlideIndex = nextCueIndex < slides[index].cues.length ? index : index + 1
    const targetCueIndex = nextCueIndex < slides[index].cues.length ? nextCueIndex : 0

    if (nextSlideIndex >= slides.length) {
      return
    }

    void getAudioUrl(nextSlideIndex, targetCueIndex).catch(() => undefined)
  }

  async function playCue(index: number, cueIndex: number, playbackId: number) {
    stopCurrentAudio()
    setTtsError(null)
    setIsFinished(false)
    setIsSpeaking(true)
    setActiveCueIndex(cueIndex)

    try {
      const audioUrl = await getAudioUrl(index, cueIndex)
      if (playbackId !== playbackIdRef.current) {
        return
      }

      const audio = audioRef.current
      audio.pause()
      audio.currentTime = 0
      audio.src = audioUrl
      preloadUpcomingAudio(index, cueIndex)

      audio.onended = () => {
        if (playbackId !== playbackIdRef.current) {
          return
        }

        stopCurrentAudio()

        if (cueIndex < slides[index].cues.length - 1) {
          scheduleNext(() => void playCue(index, cueIndex + 1, playbackId), 360)
        } else if (index < slides.length - 1) {
          setIsSpeaking(false)
          scheduleNext(() => {
            setActiveCueIndex(0)
            setActiveIndex((currentIndex) => (currentIndex === index ? index + 1 : currentIndex))
          }, 520)
        } else {
          setIsSpeaking(false)
          scheduleNext(() => setIsFinished(true), 560)
        }
      }
      audio.onerror = () => {
        if (playbackId !== playbackIdRef.current) {
          return
        }

        stopCurrentAudio()
        setIsSpeaking(false)
        setTtsError('음성을 재생하지 못했습니다. 다시 시도해 주세요.')
      }

      await audio.play()
    } catch (err) {
      if (playbackId !== playbackIdRef.current) {
        return
      }

      setIsSpeaking(false)
      setHasStarted(false)
      setTtsError(err instanceof Error && err.name === 'NotAllowedError' ? '브라우저에서 자동 재생이 막혔어요.' : 'Clova TTS 음성 생성에 실패했습니다.')
    }
  }

  function playSlideAudio(index: number) {
    lastRequestedIndexRef.current = index
    setActiveCueIndex(0)
    const playbackId = playbackIdRef.current + 1
    playbackIdRef.current = playbackId
    void playCue(index, 0, playbackId)
  }

  useEffect(() => {
    if (!hasStarted) {
      return undefined
    }

    if (lastRequestedIndexRef.current === activeIndex) {
      return undefined
    }

    playSlideAudio(activeIndex)

    return () => {
      playbackIdRef.current += 1
      lastRequestedIndexRef.current = null
      stopCurrentAudio()
    }
  }, [activeIndex, hasStarted, slides])

  useEffect(
    () => () => {
      audioCacheRef.current.forEach((audioUrl) => URL.revokeObjectURL(audioUrl))
      audioCacheRef.current.clear()
    },
    [],
  )

  function handlePlayCurrentSlide() {
    lastRequestedIndexRef.current = null
    setHasStarted(true)
    playSlideAudio(activeIndex)
  }

  return (
    <main className="welcome-page">
      <span className="welcome-particle" aria-hidden="true" />
      <span className="welcome-particle" aria-hidden="true" />
      <span className="welcome-particle" aria-hidden="true" />
      <section className="welcome-stage" aria-label="AI사수 안내">
        <div className="welcome-brand">
          <BrandMark />
          <p className="welcome-kicker">Welcome to MAGO</p>
        </div>

        <div className="welcome-slider">
          {slides.map((slide, index) => (
            <article className="welcome-slide" data-active={activeIndex === index} key={slide.title}>
              <p className="welcome-guide-label">
                {isSpeaking && activeSlide.title === slide.title ? 'AI사수가 안내 중입니다' : 'AI Onboarding Agent'}
              </p>
              <h1 key={activeIndex === index ? activeCueIndex : 0}>{activeIndex === index ? activeCue : slide.cues[0]}</h1>
            </article>
          ))}
        </div>

        <div className="welcome-footer">
          {hasStarted && !ttsError ? (
            <p className="welcome-status">{isFinished ? '준비가 끝났어요' : isSpeaking ? 'AI사수가 말하는 중입니다' : '다음 안내를 준비하고 있어요'}</p>
          ) : null}
          {ttsError ? <p className="welcome-error">{ttsError} 버튼을 누르면 음성 안내가 이어집니다.</p> : null}

          {isFinished ? (
            <div className="welcome-actions">
              <Button onClick={enterOffice} type="button" variant="primary">
                마고 사무실 입장하기
              </Button>
            </div>
          ) : null}

          {!isFinished && (!hasStarted || ttsError) ? (
            <div className="welcome-actions">
              <Button disabled={isSpeaking} onClick={handlePlayCurrentSlide} type="button" variant="primary">
                {ttsError ? '다시 시작' : '음성 안내 시작'}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
      <button className="welcome-skip-button" onClick={enterOffice} type="button">
        온보딩 소개 건너뛰기
      </button>
    </main>
  )
}
