import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import Input from '../../../components/ui/Input'
import { login, getMe } from '../api/authApi'
import { useAuthStore } from '../../../stores/authStore'

export default function LoginForm() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // 로그인 API에서 access/refresh token을 발급받는다
      const token = await login({ email, password })

      // 발급받은 토큰을 localStorage와 auth store에 저장한다
      setTokens(token.access_token, token.refresh_token)

      // 토큰 저장 직후 현재 사용자 정보를 조회해 화면 상태를 채운다
      const user = await getMe()
      setUser(user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card tone="strong" style={{ width: 'min(460px, 100%)' }}>
      <p className="eyebrow">Access Console</p>
      <h1 style={{ margin: 0 }}>온보딩 관제실 입장</h1>
      <p className="muted">사내 온보딩 문서와 AI 사수를 연결하려면 로그인하세요.</p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <Input label="이메일" type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input
          label="비밀번호"
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '접속 중...' : '로그인'}
        </Button>
      </form>
      <p className="muted">
        계정이 없다면 <Link to="/register">신입 등록</Link>
      </p>
    </Card>
  )
}
