import { apiRequest, buildApiUrl } from '../../../lib/apiClient'
import { getStoredTokens } from '../../../lib/tokenStorage'
import type {
  LearningSummary,
  PageExplanation,
  PageExplanationRequest,
  LectureSession,
  LectureSessionCreate,
  LectureSessionListResponse,
} from '../types'

export async function listLectureSessions(): Promise<LectureSession[]> {
  const response = await apiRequest<LectureSessionListResponse>('/api/v1/lecture-sessions')
  return response.sessions
}

export function getLectureSession(sessionId: string): Promise<LectureSession> {
  return apiRequest<LectureSession>(`/api/v1/lecture-sessions/${sessionId}`)
}

export function createLectureSession(payload: LectureSessionCreate): Promise<LectureSession> {
  return apiRequest<LectureSession>('/api/v1/lecture-sessions', {
    method: 'POST',
    body: payload,
  })
}

export function deleteLectureSession(sessionId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/lecture-sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

export function getLearningSummary(): Promise<LearningSummary> {
  return apiRequest<LearningSummary>('/api/v1/lecture-sessions/summary')
}

export function createPageExplanation(sessionId: string, payload: PageExplanationRequest): Promise<PageExplanation> {
  return apiRequest<PageExplanation>(`/api/v1/lecture-sessions/${sessionId}/explanations`, {
    method: 'POST',
    body: payload,
  })
}

export async function fetchPageExplanationAudio(audioUrl: string): Promise<Blob> {
  const { accessToken } = getStoredTokens()
  const response = await fetch(buildApiUrl(audioUrl), {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })
  if (!response.ok) {
    throw new Error('해설 음성을 불러오지 못했습니다.')
  }
  return response.blob()
}
