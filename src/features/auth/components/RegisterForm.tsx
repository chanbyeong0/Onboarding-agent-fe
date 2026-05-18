import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandMark from '../../../components/ui/BrandMark'
import Button from '../../../components/ui/Button'
import Card from '../../../components/ui/Card'
import Input from '../../../components/ui/Input'
import { register } from '../api/authApi'

export default function RegisterForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // 회원가입 API로 신규 온보딩 사용자를 등록한다
      await register({ email, name, password })
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card tone="strong" style={{ width: 'min(460px, 100%)' }}>
      <BrandMark />
      <p className="eyebrow">New Recruit</p>
      <h1 style={{ margin: 0 }}>온보딩 계정 생성</h1>
      <p className="muted">사내 문서를 학습하고 AI 사수에게 질문할 계정을 만듭니다.</p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <Input label="이름" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input label="이메일" type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input
          label="비밀번호"
          type="password"
          name="password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '등록 중...' : '계정 생성'}
        </Button>
      </form>
      <p className="muted">
        이미 계정이 있다면 <Link to="/login">로그인</Link>
      </p>
    </Card>
  )
}
