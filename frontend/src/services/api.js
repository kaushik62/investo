import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Track if we're already redirecting to avoid redirect loops
let _redirecting = false

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !_redirecting) {
      // Only redirect if we have a token (means it expired / invalid)
      // Don't redirect on pages that don't need auth (login, register, admin/login)
      const publicPaths = ['/login', '/register', '/admin/login']
      const isPublicPage = publicPaths.some(p => window.location.pathname === p)
      const hasToken = !!localStorage.getItem('token')

      if (hasToken && !isPublicPage) {
        _redirecting = true
        localStorage.removeItem('token')
        // Small delay to let current request settle
        setTimeout(() => {
          _redirecting = false
          window.location.href = '/login'
        }, 100)
      }
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register:      (d) => API.post('/auth/register', d),
  login:         (d) => API.post('/auth/login', d),
  adminLogin:    (d) => API.post('/auth/admin/login', d),
  getProfile:    ()  => API.get('/auth/me'),
  updateProfile: (d) => API.put('/auth/profile', d),
  changePassword:(d) => API.put('/auth/change-password', d),
}

export const stockAPI = {
  getOverview: () => API.get('/stocks/overview'),
  getAll:      () => API.get('/stocks'),
  getDetails:  (sym)    => API.get(`/stocks/${sym}`),
  getHistory:  (sym,tf) => API.get(`/stocks/${sym}/history?timeframe=${tf}`),
  getSource:   ()       => API.get('/stocks/source'),
}

export const tradeAPI = {
  buy:  (d) => API.post('/trades/buy',  d),
  sell: (d) => API.post('/trades/sell', d),
}

export const portfolioAPI = {
  get: () => API.get('/portfolio'),
}

export const watchlistAPI = {
  get:         ()              => API.get('/watchlist'),
  addStock:    (wlId, symbol)  => API.post(`/watchlist/${wlId}/stocks`, { symbol }),
  removeStock: (wlId, symbol)  => API.delete(`/watchlist/${wlId}/stocks/${symbol}`),
  create:      (name)          => API.post('/watchlist', { name }),
}

export const transactionAPI = {
  get: (params) => API.get('/transactions', { params }),
}

export const leaderboardAPI = {
  get:            () => API.get('/leaderboard'),
  getCompetition: () => API.get('/leaderboard/competition'),
}

export const adminAPI = {
  getStats:           ()       => API.get('/admin/stats'),
  getUsers:           (params) => API.get('/admin/users', { params }),
  getUser:            (id)     => API.get(`/admin/users/${id}`),
  toggleUser:         (id)     => API.put(`/admin/users/${id}/toggle`),
  broadcast:          (data)   => API.post('/admin/broadcast', data),
  getTransactions:    (params) => API.get('/admin/transactions', { params }),
  createCompetition:  (data)   => API.post('/admin/competition', data),
  updateCompetition:  (id, d)  => API.put(`/admin/competition/${id}`, d),
}

export const stripeAPI = {
  createCheckout:     () => API.post('/stripe/create-checkout-session'),
  cancelSubscription: () => API.post('/stripe/cancel-subscription'),
  getStatus:          () => API.get('/stripe/subscription-status'),
}

export const exportAPI = {
  downloadCSV: () => API.get('/export/transactions/csv'),
  downloadPDF: () => API.get('/export/portfolio/pdf'),
}

export const notificationAPI = {
  get:           () => API.get('/notifications'),
  markAllRead:   () => API.put('/notifications/read-all'),
  setPriceAlert: (d) => API.post('/notifications/price-alert', d),
}

export default API
