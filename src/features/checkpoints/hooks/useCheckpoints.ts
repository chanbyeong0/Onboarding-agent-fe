import { useCallback, useEffect, useState } from 'react'
import { createCheckpoint, listMyCheckpoints } from '../api/checkpointApi'
import type { Checkpoint, CheckpointCreate } from '../types'

export function useCheckpoints() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCheckpoints = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // 현재 사용자 체크포인트 목록을 백엔드에서 다시 가져온다
      const items = await listMyCheckpoints()
      setCheckpoints(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '체크포인트 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addCheckpoint = useCallback(async (payload: CheckpointCreate) => {
    setError(null)
    try {
      // 새 체크포인트를 저장하고 화면 목록 앞쪽에 반영한다
      const created = await createCheckpoint(payload)
      setCheckpoints((current) => [created, ...current])
      return created
    } catch (err) {
      setError(err instanceof Error ? err.message : '체크포인트 저장에 실패했습니다.')
      return null
    }
  }, [])

  useEffect(() => {
    // 대시보드 진입 시 기존 체크포인트를 초기 로딩한다
    void loadCheckpoints()
  }, [loadCheckpoints])

  return { checkpoints, isLoading, error, loadCheckpoints, addCheckpoint }
}
