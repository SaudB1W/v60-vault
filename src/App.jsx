import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import BeanDetailPage from './pages/BeanDetailPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import MySuggestionsPage from './pages/MySuggestionsPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useLanguage } from './context/LanguageContext.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { language } = useLanguage()
  const { hydrated } = useAuth()
  const isAr = language === 'ar'

  // Hold the whole tree until Supabase has answered the session check —
  // otherwise protected routes would briefly mount with a null user and
  // RLS-blocked queries would fire before the /login redirect lands.
  if (!hydrated) {
    return (
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        lang={isAr ? 'ar' : 'en'}
        className={isAr ? 'rtl' : ''}
      />
    )
  }

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      lang={isAr ? 'ar' : 'en'}
      className={isAr ? 'rtl' : ''}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LandingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bean/:id"
          element={
            <ProtectedRoute>
              <BeanDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-suggestions"
          element={
            <ProtectedRoute>
              <MySuggestionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <LandingPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}
