import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { MarketProvider } from './context/MarketContext'
import { ProtectedRoute, PublicRoute } from './components/common/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import Login        from './pages/Login'
import Register     from './pages/Register'
import Dashboard    from './pages/Dashboard'
import Market       from './pages/Market'
import StockDetail  from './pages/StockDetail'
import Portfolio    from './pages/Portfolio'
import Watchlist    from './pages/Watchlist'
import Transactions from './pages/Transactions'
import Profile      from './pages/Profile'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function Wrap({ children }) {
  return <AppLayout>{children}</AppLayout>
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

              {/* Protected — must be logged in */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard"    element={<Wrap><Dashboard    /></Wrap>} />
                <Route path="/market"       element={<Wrap><Market        /></Wrap>} />
                <Route path="/stock/:symbol" element={<Wrap><StockDetail   /></Wrap>} />
                <Route path="/portfolio"    element={<Wrap><Portfolio      /></Wrap>} />
                <Route path="/watchlist"    element={<Wrap><Watchlist      /></Wrap>} />
                <Route path="/transactions" element={<Wrap><Transactions   /></Wrap>} />
                <Route path="/profile"      element={<Wrap><Profile        /></Wrap>} />
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
