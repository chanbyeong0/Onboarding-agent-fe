import { ChangeEvent, useState } from 'react'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import { uploadDocument } from '../api/documentApi'
import type { DocumentItem } from '../types'

type DocumentUploaderProps = {
  onUploaded: (document: DocumentItem) => void
}

export default function DocumentUploader({ onUploaded }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null)
    setFile(event.target.files?.[0] ?? null)
  }

  async function handleUpload() {
    if (!file) {
      setError('업로드할 PDF/PPT 파일을 선택해주세요.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // 선택한 파일을 백엔드 업로드 API로 전송한다
      const uploaded = await uploadDocument(file)
      onUploaded(uploaded)
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="stack">
      <div>
        <p className="eyebrow">Mission File</p>
        <h2 style={{ margin: 0 }}>문서 업로드</h2>
        <p className="muted">PDF, PPT, PPTX 자료를 올리면 AI 사수가 참고할 임무 자료로 등록됩니다.</p>
      </div>
      <input accept=".pdf,.ppt,.pptx" type="file" onChange={handleFileChange} />
      {file ? <p className="muted">선택됨: {file.name}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <Button type="button" onClick={handleUpload} disabled={isUploading}>
        {isUploading ? '업로드 중...' : '문서 등록'}
      </Button>
    </Card>
  )
}
