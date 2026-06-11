import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../services/api'

export default function AdminLogin() {
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ email: 'admin@Investo.com', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await API.post('/auth/admin/login', form)
      const { token, user } = res.data

      // Set token in localStorage FIRST, then update context
      loginWithToken(token, user)

      // Short timeout so React state settles before navigation
      setTimeout(() => navigate('/admin', { replace: true }), 50)
    } catch (err) {
      setError(err.response?.data?.error || 'Admin login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef233c, #9b1c1c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '2rem',
            boxShadow: '0 0 30px rgba(239,35,60,0.25)',
          }}>🛡️</div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Admin Portal</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.875rem' }}>
            Investo Administration
          </p>
        </div>

        <div className="card-elevated">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              🚫 {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Admin Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="admin@Investo.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Admin Password
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-danger"
              style={{ padding: '0.75rem', fontSize: '0.95rem', marginTop: 4, width: '100%' }}
            >
              {loading ? 'Authenticating…' : '🛡️ Login as Admin'}
            </button>
          </form>

          {/* Click-to-fill credentials */}
          <div style={{
            marginTop: '1.5rem', padding: '1rem',
            background: 'rgba(239,35,60,0.06)',
            border: '1px solid rgba(239,35,60,0.15)',
            borderRadius: 10,
          }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 8px', fontWeight: 600 }}>
              🔐 Default Admin Credentials
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                onClick={() => setForm({ email: 'admin@Investo.com', password: 'admin123456' })}
                style={{
                  background: 'rgba(67,97,238,0.1)', border: '1px solid rgba(67,97,238,0.2)',
                  borderRadius: 7, padding: '7px 12px', cursor: 'pointer',
                  color: 'var(--blue)', fontSize: '0.82rem', fontWeight: 600, textAlign: 'left',
                }}
              >
                ✨ Click to autofill: admin@Investo.com / admin123456
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textDecoration: 'none' }}>
              ← Back to regular login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
