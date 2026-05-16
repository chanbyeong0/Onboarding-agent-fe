import { apiRequest, buildApiUrl } from '../../../lib/apiClient'
import type { DocumentItem, DocumentListResponse, DocumentPage, DocumentPageListResponse } from '../types'

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

export async function listDocumentPages(documentId: string): Promise<DocumentPage[]> {
  // 문서의 페이지 이미지 URL과 텍스트를 페이지 번호순으로 조회한다
  const response = await apiRequest<DocumentPageListResponse>(`/api/v1/documents/${documentId}/pages`)
  return response.pages
}

export function buildDocumentPageImageUrl(imageUrl: string): string {
  // 페이지 이미지 URL도 프론트 nginx 프록시를 거치도록 같은 API base를 사용한다
  return buildApiUrl(imageUrl)
}

export function buildDocumentViewerPdfUrl(viewerPdfUrl: string): string {
  // PDF 원본 뷰어도 프론트 nginx 프록시를 거쳐 같은 origin에서 로드한다
  return buildApiUrl(viewerPdfUrl)
}
