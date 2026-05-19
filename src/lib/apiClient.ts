import { clearStoredTokens, getStoredTokens, setStoredTokens } from './tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
  skipRefresh?: boolean
}

function assertRelativePath(path: string): void {
  if (/^(https?:)?\/\//.test(path)) {
    throw new Error('API path must be relative')
  }
}

function buildUrl(path: string): string {
  // 절대 URL 입력을 차단해 base URL 우회를 막는다
  assertRelativePath(path)
  return `${API_BASE_URL}${path}`
}

function buildBodyAndHeaders(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined
  }

  if (body instanceof FormData) {
    return body
  }

  // JSON 요청은 Content-Type을 명시하고 문자열로 직렬화한다
  headers.set('Content-Type', 'application/json')
  return JSON.stringify(body)
}

async function parseError(response: Response): Promise<string> {
  try {
    // 백엔드 HTTPException detail을 우선적으로 사용자 메시지로 사용한다
    const data = (await response.json()) as { detail?: string }
    return data.detail ?? response.statusText
  } catch {
    return response.statusText
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getStoredTokens()
  if (!refreshToken) {
    return null
  }

  // refresh token으로 백엔드에 새 access token 발급을 요청한다
  const response = await fetch(buildUrl('/api/v1/users/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!response.ok) {
    // refresh 실패 시 재시도를 멈추도록 저장된 토큰을 정리한다
    clearStoredTokens()
    return null
  }

  const data = (await response.json()) as { access_token: string; refresh_token?: string | null }

  // 새 access token과 선택적으로 교체된 refresh token을 localStorage에 저장한다
  setStoredTokens(data.access_token, data.refresh_token ?? refreshToken)
  return data.access_token
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const { accessToken } = getStoredTokens()

  if (!options.skipAuth && accessToken) {
    // 저장된 access token을 Bearer 헤더에 자동 첨부한다
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  // 요청 본문 타입에 맞춰 body와 header를 구성한다
  const body = buildBodyAndHeaders(options.body, headers)

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    body,
  })

  if (response.status === 401 && !options.skipRefresh) {
    // access token 만료 가능성이 있으므로 refresh를 한 번 시도한다
    const refreshedAccessToken = await refreshAccessToken()
    if (refreshedAccessToken) {
      // 새 access token으로 원 요청을 한 번만 재시도한다
      return apiRequest<T>(path, { ...options, skipRefresh: true })
    }
  }

  if (!response.ok) {
    // 오류 응답 본문을 읽어 도메인 에러로 변환한다
    throw new ApiError(response.status, await parseError(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  // 성공 응답을 JSON 타입으로 역직렬화한다
  return (await response.json()) as T
}

export function buildApiUrl(path: string): string {
  return buildUrl(path)
}
