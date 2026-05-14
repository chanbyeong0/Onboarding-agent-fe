const ACCESS_TOKEN_KEY = 'onboarding_access_token'
const REFRESH_TOKEN_KEY = 'onboarding_refresh_token'

export type StoredTokens = {
  accessToken: string | null
  refreshToken: string | null
}

export function getStoredTokens(): StoredTokens {
  // 브라우저 localStorage에서 인증 토큰을 읽어 Zustand 초기화에 사용한다
  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
  }
}

export function setStoredTokens(accessToken: string, refreshToken: string | null): void {
  // 새 access token을 localStorage에 저장해 새로고침 후에도 인증 상태를 복구한다
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)

  if (refreshToken) {
    // 백엔드가 refresh token을 내려준 경우 함께 저장해 401 재시도에 사용한다
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearStoredTokens(): void {
  // 로그아웃 또는 refresh 실패 시 남아 있는 토큰을 모두 제거한다
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
