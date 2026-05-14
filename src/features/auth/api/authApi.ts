import { apiRequest } from '../../../lib/apiClient'
import type { LoginRequest, RegisterRequest, TokenResponse, User } from '../types'

export function register(payload: RegisterRequest): Promise<User> {
  // 회원가입 요청을 백엔드 사용자 등록 API로 전달한다
  return apiRequest<User>('/api/v1/users/register', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  })
}

export function login(payload: LoginRequest): Promise<TokenResponse> {
  // 로그인 요청으로 access/refresh token을 JSON 응답으로 받는다
  return apiRequest<TokenResponse>('/api/v1/users/login', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  })
}

export function refresh(refreshToken: string): Promise<TokenResponse> {
  // localStorage에 저장된 refresh token으로 새 access token을 요청한다
  return apiRequest<TokenResponse>('/api/v1/users/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    skipAuth: true,
    skipRefresh: true,
  })
}

export function logout(refreshToken: string | null): Promise<{ message: string }> {
  // 서버에 저장된 refresh 세션을 폐기해 로그아웃 상태를 확정한다
  return apiRequest<{ message: string }>('/api/v1/users/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    skipAuth: true,
    skipRefresh: true,
  })
}

export function getMe(): Promise<User> {
  // 현재 access token으로 사용자 프로필을 조회한다
  return apiRequest<User>('/api/v1/users/me')
}
