export type User = {
  id: string
  email: string
  name: string
  created_at: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
  name: string
}

export type TokenResponse = {
  access_token: string
  refresh_token: string | null
  token_type: 'bearer'
}
