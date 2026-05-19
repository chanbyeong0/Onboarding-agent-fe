import { apiRequest } from '../../../lib/apiClient'
import type {
  PracticeTask,
  PracticeTaskAssistRequest,
  PracticeTaskAssistResponse,
  PracticeTaskCreateRequest,
  PracticeTaskListResponse,
  PracticeTaskStatus,
} from '../types'

type ListPracticeTaskParams = {
  documentId?: string
  pageNumber?: number
  status?: PracticeTaskStatus
}

function buildPracticeTaskQuery(params: ListPracticeTaskParams = {}) {
  const search = new URLSearchParams()
  if (params.documentId) search.set('document_id', params.documentId)
  if (params.pageNumber !== undefined) search.set('page_number', String(params.pageNumber))
  if (params.status) search.set('status_filter', params.status)
  const query = search.toString()
  return query ? `?${query}` : ''
}

export async function listPracticeTasks(sessionId: string, params: ListPracticeTaskParams = {}): Promise<PracticeTask[]> {
  const response = await apiRequest<PracticeTaskListResponse>(
    `/api/v1/lecture-sessions/${sessionId}/practice-tasks${buildPracticeTaskQuery(params)}`,
  )
  return response.tasks
}

export async function generatePracticeTasks(sessionId: string, documentId?: string): Promise<PracticeTask[]> {
  const response = await apiRequest<PracticeTaskListResponse>(`/api/v1/lecture-sessions/${sessionId}/practice-tasks/generate`, {
    method: 'POST',
    body: { document_id: documentId ?? null },
  })
  return response.tasks
}

export function createPracticeTask(sessionId: string, payload: PracticeTaskCreateRequest): Promise<PracticeTask> {
  return apiRequest<PracticeTask>(`/api/v1/lecture-sessions/${sessionId}/practice-tasks`, {
    method: 'POST',
    body: payload,
  })
}

export function assistPracticeTask(sessionId: string, payload: PracticeTaskAssistRequest): Promise<PracticeTaskAssistResponse> {
  return apiRequest<PracticeTaskAssistResponse>(`/api/v1/lecture-sessions/${sessionId}/practice-tasks/assist`, {
    method: 'POST',
    body: payload,
  })
}

export function updatePracticeTaskStatus(sessionId: string, taskId: string, status: PracticeTaskStatus): Promise<PracticeTask> {
  return apiRequest<PracticeTask>(`/api/v1/lecture-sessions/${sessionId}/practice-tasks/${taskId}`, {
    method: 'PATCH',
    body: { status },
  })
}

export function deletePracticeTask(sessionId: string, taskId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/lecture-sessions/${sessionId}/practice-tasks/${taskId}`, {
    method: 'DELETE',
  })
}
