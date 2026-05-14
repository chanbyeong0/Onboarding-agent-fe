import { create } from 'zustand'
import { getMe, logout as requestLogout, refresh as requestRefresh } from '../features/auth/api/authApi'
import type { User } from '../features/auth/types'
import { clearStoredTokens, getStoredTokens, setStoredTokens } from '../lib/tokenStorage'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isHydrated: boolean
  setTokens: (accessToken: string, refreshToken: string | null) => void
  setUser: (user: User | null) => void
  hydrateFromStorage: () => Promise<void>
  clearAuth: () => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isHydrated: false,
  setTokens: (accessToken, refreshToken) => {
    // 로그인/refresh 결과 토큰을 localStorage와 메모리 상태에 함께 반영한다
    setStoredTokens(accessToken, refreshToken)
    set({ accessToken, refreshToken })
  },
  setUser: (user) => set({ user }),
  hydrateFromStorage: async () => {
    // 새로고침 후 localStorage의 토큰을 Zustand 상태로 복구한다
    const tokens = getStoredTokens()
    set({ ...tokens, isHydrated: true })

    if (!tokens.accessToken && tokens.refreshToken) {
      try {
        // access token이 없으면 refresh token으로 새 access token을 요청한다
        const refreshed = await requestRefresh(tokens.refreshToken)
        get().setTokens(refreshed.access_token, refreshed.refresh_token ?? tokens.refreshToken)
      } catch {
        get().clearAuth()
        return
      }
    }

    if (get().accessToken) {
      try {
        // 현재 access token으로 사용자 정보를 복구한다
        const user = await getMe()
        set({ user })
      } catch {
        get().clearAuth()
      }
    }
  },
  clearAuth: () => {
    // 인증 실패 또는 로그아웃 시 저장소와 메모리 상태를 동시에 비운다
    clearStoredTokens()
    set({ accessToken: null, refreshToken: null, user: null, isHydrated: true })
  },
  logout: async () => {
    const { refreshToken } = get()
    try {
      // 서버 refresh 세션 폐기를 요청해 토큰 재사용 가능성을 줄인다
      await requestLogout(refreshToken)
    } finally {
      get().clearAuth()
    }
  },
}))
