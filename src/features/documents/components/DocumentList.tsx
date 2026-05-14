import Card from '../../../components/ui/Card'
import type { DocumentItem } from '../types'

type DocumentListProps = {
  documents: DocumentItem[]
  selectedDocumentId: string | null
  onSelect: (document: DocumentItem) => void
}

export default function DocumentList({ documents, selectedDocumentId, onSelect }: DocumentListProps) {
  return (
    <Card className="stack">
      <div>
        <p className="eyebrow">Archive</p>
        <h2 style={{ margin: 0 }}>등록 문서</h2>
      </div>
      {documents.length === 0 ? (
        <p className="muted">아직 업로드된 문서가 없습니다.</p>
      ) : (
        <div className="stack">
          {documents.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => onSelect(document)}
              style={{
                padding: '14px',
                color: 'var(--text)',
                textAlign: 'left',
                background: selectedDocumentId === document.id ? 'rgba(157,255,63,0.16)' : 'rgba(255,255,255,0.05)',
                border: '1px solid var(--line)',
                borderRadius: '16px',
                cursor: 'pointer',
              }}
            >
              <strong>{document.title}</strong>
              <br />
              <span className="muted">{document.file_type.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
