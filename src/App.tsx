import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { useAuthStore } from './stores/authStore'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const isHydrated = useAuthStore((state) => state.isHydrated)

  if (!isHydrated) {
    return <main className="auth-shell">세션을 확인하는 중입니다...</main>
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage)

  useEffect(() => {
    // 앱 부팅 시 localStorage의 토큰을 Zustand 인증 상태로 복구한다
    void hydrateFromStorage()
  }, [hydrateFromStorage])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
