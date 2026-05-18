import { apiRequest } from '../../../lib/apiClient'
import type { ExamAttempt, ExamSubmitRequest } from '../types'

export function createExam(sessionId: string): Promise<ExamAttempt> {
  return apiRequest<ExamAttempt>(`/api/v1/lecture-sessions/${sessionId}/exams`, {
    method: 'POST',
  })
}

export function getLatestExam(sessionId: string): Promise<ExamAttempt | null> {
  return apiRequest<ExamAttempt | null>(`/api/v1/lecture-sessions/${sessionId}/exams/latest`)
}

export function submitExam(sessionId: string, examId: string, payload: ExamSubmitRequest): Promise<ExamAttempt> {
  return apiRequest<ExamAttempt>(`/api/v1/lecture-sessions/${sessionId}/exams/${examId}/submit`, {
    method: 'POST',
    body: payload,
  })
}
