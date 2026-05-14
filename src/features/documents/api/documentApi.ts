import { apiRequest } from '../../../lib/apiClient'
import type { DocumentItem, DocumentListResponse } from '../types'

export function uploadDocument(file: File): Promise<DocumentItem> {
  const formData = new FormData()

  // FastAPI UploadFile이 기대하는 file 필드명으로 업로드 파일을 추가한다
  formData.append('file', file)

  // multipart 요청은 apiClient가 Content-Type을 직접 설정하지 않게 FormData를 전달한다
  return apiRequest<DocumentItem>('/api/v1/documents/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function listDocuments(): Promise<DocumentItem[]> {
  // 백엔드 문서 목록 응답에서 documents 배열만 추출한다
  const response = await apiRequest<DocumentListResponse>('/api/v1/documents')
  return response.documents
}

export function getDocument(documentId: string): Promise<DocumentItem> {
  // 선택한 문서 ID로 문서 상세 메타데이터를 조회한다
  return apiRequest<DocumentItem>(`/api/v1/documents/${documentId}`)
}
