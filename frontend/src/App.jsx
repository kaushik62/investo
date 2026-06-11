import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { MarketProvider } from './context/MarketContext'
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/common/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import Login        from './pages/Login'
import Register     from './pages/Register'
import AdminLogin   from './pages/AdminLogin'
import Dashboard    from './pages/Dashboard'
import Market       from './pages/Market'
import StockDetail  from './pages/StockDetail'
import Portfolio    from './pages/Portfolio'
import Watchlist    from './pages/Watchlist'
import Transactions from './pages/Transactions'
import Leaderboard  from './pages/Leaderboard'
import Subscription from './pages/Subscription'
import Profile      from './pages/Profile'
import Admin        from './pages/Admin'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function Wrap({ children }) {
  return <AppLayout>{children}</AppLayout>
}

function SuccessPage() {
  return (
    <Wrap>
      <div style={{ textAlign: 'center', padding: '5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 className="font-display" style={{ color: 'var(--green)', fontSize: '1.6rem' }}>Subscription Activated!</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Welcome to Investo Premium</p>
        <a href="/dashboard" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
          <button className="btn btn-primary">Go to Dashboard →</button>
        </a>
      </div>
    </Wrap>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MarketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public only (redirect to dashboard if logged in) */}
              <Route element={<PublicRoute />}>
                <Route path="/login"       element={<Login />} />
                <Route path="/register"    element={<Register />} />
              </Route>

              {/* Admin login — always accessible */}
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Protected — must be logged in */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard"             element={<Wrap><Dashboard    /></Wrap>} />
                <Route path="/market"                element={<Wrap><Market        /></Wrap>} />
                <Route path="/stock/:symbol"         element={<Wrap><StockDetail   /></Wrap>} />
                <Route path="/portfolio"             element={<Wrap><Portfolio      /></Wrap>} />
                <Route path="/watchlist"             element={<Wrap><Watchlist      /></Wrap>} />
                <Route path="/transactions"          element={<Wrap><Transactions   /></Wrap>} />
                <Route path="/leaderboard"           element={<Wrap><Leaderboard    /></Wrap>} />
                <Route path="/subscription"          element={<Wrap><Subscription   /></Wrap>} />
                <Route path="/subscription/success"  element={<SuccessPage />} />
                <Route path="/profile"               element={<Wrap><Profile        /></Wrap>} />
              </Route>

              {/* Admin only */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<Wrap><Admin /></Wrap>} />
              </Route>

              <Route path="/"   element={<Navigate to="/dashboard" replace />} />
              <Route path="*"   element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </MarketProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
