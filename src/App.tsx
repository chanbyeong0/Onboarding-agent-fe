import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'
import ExamPage from './pages/ExamPage'
import LectureSessionPage from './pages/LectureSessionPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WelcomePage from './pages/WelcomePage'
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

function AdminRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function HomeRedirect() {
  const user = useAuthStore((state) => state.user)
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
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
            <HomeRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/welcome"
        element={
          <ProtectedRoute>
            <WelcomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:sessionId"
        element={
          <ProtectedRoute>
            <LectureSessionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:sessionId/exam"
        element={
          <ProtectedRoute>
            <ExamPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
