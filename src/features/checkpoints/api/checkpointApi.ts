import { apiRequest } from '../../../lib/apiClient'
import type { Checkpoint, CheckpointCreate } from '../types'

export function createCheckpoint(payload: CheckpointCreate): Promise<Checkpoint> {
  // 사용자가 모르는 항목으로 입력한 내용을 체크포인트 API에 저장한다
  return apiRequest<Checkpoint>('/api/v1/checkpoints', {
    method: 'POST',
    body: payload,
  })
}

export function listMyCheckpoints(): Promise<Checkpoint[]> {
  // 현재 로그인 사용자의 체크포인트 목록을 조회한다
  return apiRequest<Checkpoint[]>('/api/v1/checkpoints/me')
}

export function listMySessionCheckpoints(sessionId: string): Promise<Checkpoint[]> {
  // 강의 세션 안에서 저장한 체크포인트만 조회한다
  return apiRequest<Checkpoint[]>(`/api/v1/checkpoints/sessions/${sessionId}/me`)
}
