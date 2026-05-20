import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import { synthesizeChatTts } from '../features/chat/api/chatApi'

const MARKDOWN_URL = '/demo/weekly-workshop.md'
const MARKDOWN_STORAGE_KEY = 'weekly-workshop-markdown'
const MARKDOWN_STORAGE_VERSION_KEY = 'weekly-workshop-markdown-version'
const MARKDOWN_VERSION = '2026-05-20-weekly-task-first'

const GUIDE_STEPS = [
  {
    script:
      '위클리는 내가 하고 있는 일을 팀에 공유하고, 이번 주 업무 흐름을 함께 맞추는 시간입니다. MAGO에서는 노션의 Team Space, Developers, Meetings에 위클리 문서를 작성합니다. 먼저 위클리가 무엇인지 확인했다면 다음으로 넘어가볼게요.',
    actionLabel: '위클리 이해 완료',
    actionType: 'confirm',
  },
  {
    script:
      '위클리 작성은 태스크를 기준으로 시작하면 좋아요. 실제 노션에서는 먼저 이번 주에 공유할 태스크를 확인하고, 마감일, 상태, 담당자가 빠지지 않았는지 점검합니다. 여기서는 태스크를 직접 만들지는 않고, 어떤 태스크를 기준으로 작성할지 정했다고 가정하고 다음으로 넘어가볼게요.',
    actionLabel: '태스크 기준 확인 완료',
    actionType: 'confirm',
  },
  {
    script:
      '좋아요. 이제 진행 상황 공유 영역입니다. 골뱅이를 입력해서 내 이름을 멘션하고, 지금 하고 있는 일의 전체 흐름을 키워드로 한 문장 정리해주세요.',
    actionLabel: '멘션과 키워드 확인 완료',
    actionType: 'confirm',
  },
  {
    script:
      '다음은 완료한 사항입니다. 완료한 사항 표 아래의 행 추가 버튼을 눌러 이번 주에 끝낸 작업을 하나 추가해보세요.',
    requiredAction: 'table-0-row-added',
    actionHint: '완료한 사항 표에 행을 추가하면 다음 안내로 넘어갑니다.',
  },
  {
    script:
      '이제 현재 진행 중인 사항입니다. 지금 작업 중인 내용을 표에 추가하고, 설명에는 현재 어디까지 진행됐는지 짧게 적어주세요.',
    requiredAction: 'table-1-row-added',
    actionHint: '현재 진행 중인 사항 표에 행을 추가하면 다음 안내로 넘어갑니다.',
  },
  {
    script:
      '다음에 진행할 사항도 정리해볼게요. 다음 액션이 명확해지도록 할 일을 하나 추가해주세요.',
    requiredAction: 'table-2-row-added',
    actionHint: '다음에 진행할 사항 표에 행을 추가하면 다음 안내로 넘어갑니다.',
  },
  {
    script:
      '마지막으로 공유할 내용이나 어려움을 겪는 부분이 있다면 아래 콜아웃에 적어주세요. 모두 적었다면 마무리 버튼을 눌러주세요.',
    actionLabel: '가이드 마무리',
    actionType: 'confirm',
  },
  {
    script: '좋습니다. 위클리 문서 작성 흐름을 모두 확인했어요. 이제 이 문서를 기준으로 팀에 진행 상황을 공유하면 됩니다.',
    actionType: 'done',
  },
]

export default function WeeklyWorkshopPage() {
  const [markdown, setMarkdown] = useState('')
  const [guideIndex, setGuideIndex] = useState(0)
  const [isTtsBlocked, setIsTtsBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const playbackIdRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  function stopGuide() {
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

  async function playGuideLine(index: number, playbackId: number) {
    stopGuide()
    setGuideIndex(index)
    setIsTtsBlocked(false)

    try {
      const audioBlob = await synthesizeChatTts(GUIDE_STEPS[index].script)
      if (playbackId !== playbackIdRef.current) {
        return
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = audioRef.current
      audio.src = audioUrl
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        setIsTtsBlocked(true)
      }

      await audio.play()
    } catch {
      setIsTtsBlocked(true)
    }
  }

  function startGuide() {
    const playbackId = playbackIdRef.current + 1
    playbackIdRef.current = playbackId
    void playGuideLine(guideIndex, playbackId)
  }

  function moveToGuideStep(nextIndex: number) {
    const boundedIndex = Math.min(nextIndex, GUIDE_STEPS.length - 1)
    const playbackId = playbackIdRef.current + 1
    playbackIdRef.current = playbackId
    void playGuideLine(boundedIndex, playbackId)
  }

  function completeCurrentGuideAction() {
    moveToGuideStep(guideIndex + 1)
  }

  function completeRequiredAction(action: string) {
    if (GUIDE_STEPS[guideIndex].requiredAction === action) {
      moveToGuideStep(guideIndex + 1)
    }
  }

  useEffect(() => {
    startGuide()

    return () => {
      playbackIdRef.current += 1
      stopGuide()
    }
  }, [])

  useEffect(() => {
    const savedMarkdown = window.localStorage.getItem(MARKDOWN_STORAGE_KEY)
    const savedVersion = window.localStorage.getItem(MARKDOWN_STORAGE_VERSION_KEY)
    if (savedMarkdown && savedVersion === MARKDOWN_VERSION) {
      setMarkdown(savedMarkdown)
      return
    }

    window.localStorage.removeItem(MARKDOWN_STORAGE_KEY)
    window.localStorage.setItem(MARKDOWN_STORAGE_VERSION_KEY, MARKDOWN_VERSION)

    fetch(MARKDOWN_URL)
      .then((response) => response.text())
      .then((text) => {
        setMarkdown(text)
      })
      .catch(() => {
        const fallbackMarkdown = '# 위클리 작성 가이드\n\nMarkdown 문서를 불러오지 못했습니다.'
        setMarkdown(fallbackMarkdown)
      })
  }, [])

  function resetMarkdown() {
    window.localStorage.removeItem(MARKDOWN_STORAGE_KEY)
    window.localStorage.setItem(MARKDOWN_STORAGE_VERSION_KEY, MARKDOWN_VERSION)
    fetch(MARKDOWN_URL)
      .then((response) => response.text())
      .then((text) => {
        setMarkdown(text)
      })
  }

  function persistMarkdown(nextMarkdown: string) {
    setMarkdown(nextMarkdown)
    window.localStorage.setItem(MARKDOWN_STORAGE_KEY, nextMarkdown)
    window.localStorage.setItem(MARKDOWN_STORAGE_VERSION_KEY, MARKDOWN_VERSION)
  }

  function updateMarkdownLine(index: number, nextLine: string) {
    const lines = markdown.split('\n')
    lines[index] = nextLine
    persistMarkdown(lines.join('\n'))
  }

  function editableText(text: string, onSave: (value: string) => void) {
    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: (event: FocusEvent<HTMLElement>) => onSave(event.currentTarget.innerText.trim()),
    }
  }

  function renderInlineText(text: string) {
    return text.replaceAll('`', '')
  }

  function renderMarkdownLine(line: string, index: number) {
    if (line.startsWith('# ')) {
      return (
        <h1 key={index} {...editableText(line.replace(/^# /, ''), (value) => updateMarkdownLine(index, `# ${value}`))}>
          {line.replace(/^# /, '')}
        </h1>
      )
    }

    if (line.startsWith('## ')) {
      return (
        <h2 key={index} {...editableText(line.replace(/^## /, ''), (value) => updateMarkdownLine(index, `## ${value}`))}>
          {line.replace(/^## /, '')}
        </h2>
      )
    }

    if (line.startsWith('### ')) {
      return (
        <h3 key={index} {...editableText(line.replace(/^### /, ''), (value) => updateMarkdownLine(index, `### ${value}`))}>
          {line.replace(/^### /, '')}
        </h3>
      )
    }

    if (line.startsWith('#### ')) {
      return (
        <h4 key={index} {...editableText(line.replace(/^#### /, ''), (value) => updateMarkdownLine(index, `#### ${value}`))}>
          {line.replace(/^#### /, '')}
        </h4>
      )
    }

    if (line.startsWith('- ')) {
      const text = renderInlineText(line.replace(/^- /, ''))
      return (
        <li key={index} {...editableText(text, (value) => updateMarkdownLine(index, `- ${value}`))}>
          {text}
        </li>
      )
    }

    if (line.startsWith('> ')) {
      return (
        <blockquote key={index} {...editableText(line.replace(/^> /, ''), (value) => updateMarkdownLine(index, `> ${value}`))}>
          {line.replace(/^> /, '')}
        </blockquote>
      )
    }

    if (!line.trim()) {
      return <div className="weekly-md-spacer" key={index} />
    }

    return (
      <p key={index} {...editableText(renderInlineText(line), (value) => updateMarkdownLine(index, value))}>
        {renderInlineText(line)}
      </p>
    )
  }

  function parseTableRow(line: string) {
    return line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => renderInlineText(cell.trim()))
  }

  function isTableDivider(line: string) {
    return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim())
  }

  function updateTableCell(lineIndex: number, cellIndex: number, value: string) {
    const lines = markdown.split('\n')
    const cells = parseTableRow(lines[lineIndex])
    cells[cellIndex] = value
    lines[lineIndex] = `| ${cells.join(' | ')} |`
    persistMarkdown(lines.join('\n'))
  }

  function addTableRow(afterLineIndex: number, columnCount: number, tableIndex: number) {
    const lines = markdown.split('\n')
    const emptyCells = Array.from({ length: columnCount }, () => '')
    lines.splice(afterLineIndex + 1, 0, `| ${emptyCells.join(' | ')} |`)
    persistMarkdown(lines.join('\n'))
    completeRequiredAction(`table-${tableIndex}-row-added`)
  }

  function renderMarkdownBlocks(markdownText: string) {
    const lines = markdownText.split('\n')
    const blocks = []
    let tableIndex = 0

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]

      if (line.startsWith('|')) {
        const tableLines = []
        while (index < lines.length && lines[index].startsWith('|')) {
          tableLines.push(lines[index])
          index += 1
        }
        index -= 1

        const [headerLine, dividerLine, ...bodyLines] = tableLines
        const headers = parseTableRow(headerLine)
        const hasDivider = isTableDivider(dividerLine)
        const rows = hasDivider ? bodyLines.map(parseTableRow) : tableLines.slice(1).map(parseTableRow)
        const tableStartIndex = index - tableLines.length + 1
        const bodyStartOffset = hasDivider ? 2 : 1
        const tableEndIndex = tableStartIndex + tableLines.length - 1
        const currentTableIndex = tableIndex

        blocks.push(
          <div className="weekly-md-table-wrap" key={`table-${index}`}>
            <table className="weekly-md-table">
              <thead>
                <tr>
                  {headers.map((header, cellIndex) => (
                    <th
                      key={`${header}-${cellIndex}`}
                      {...editableText(header, (value) => updateTableCell(tableStartIndex, cellIndex, value))}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${rowIndex}-${cellIndex}`}
                        {...editableText(cell, (value) => updateTableCell(tableStartIndex + bodyStartOffset + rowIndex, cellIndex, value))}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="weekly-md-add-row" onClick={() => addTableRow(tableEndIndex, headers.length, currentTableIndex)} type="button">
              + 행 추가
            </button>
          </div>,
        )
        tableIndex += 1
        continue
      }

      blocks.push(renderMarkdownLine(line, index))
    }

    return blocks
  }

  return (
    <div className="weekly-workshop-page">
      <header className="office-topbar">
        <BrandMark compact />
        <div className="office-topbar__right">
          <Link className="office-secondary-link" to="/office">
            사무실로 돌아가기
          </Link>
        </div>
      </header>

      <main className="weekly-workshop-main">
        <section className="weekly-guide-card">
          <p className="office-label">Thursday Workshop</p>
          <h1>위클리 작성 워크샵</h1>
          <div className="weekly-guide-bubble">
            <span>AI사수</span>
            <p key={guideIndex}>{GUIDE_STEPS[guideIndex].script}</p>
          </div>
          {GUIDE_STEPS[guideIndex].actionHint ? (
            <p className="weekly-guide-hint">{GUIDE_STEPS[guideIndex].actionHint}</p>
          ) : null}
          {GUIDE_STEPS[guideIndex].actionType === 'confirm' ? (
            <Button type="button" onClick={completeCurrentGuideAction}>
              {GUIDE_STEPS[guideIndex].actionLabel}
            </Button>
          ) : null}
          {GUIDE_STEPS[guideIndex].actionType === 'done' ? <p className="weekly-guide-done">가이드 완료</p> : null}
          <p className="office-muted">Markdown 문서를 보면서 노션 위클리 문서를 어떤 순서로 작성하는지 익혀봅니다.</p>
          {isTtsBlocked ? (
            <Button type="button" onClick={startGuide}>
              음성 설명 듣기
            </Button>
          ) : null}
        </section>

        <section className="weekly-md-card">
          <div className="weekly-md-header">
            <div>
              <p className="office-label">Notion Template</p>
              <h2>weekly-workshop.md</h2>
            </div>
            <div className="weekly-md-actions">
              <span className="weekly-save-status">클릭해서 바로 수정 · 자동 저장</span>
              <Button type="button" variant="secondary" onClick={resetMarkdown}>
                원본 복원
              </Button>
            </div>
          </div>

          <div className="weekly-md-viewer">{renderMarkdownBlocks(markdown)}</div>
        </section>
      </main>
    </div>
  )
}
