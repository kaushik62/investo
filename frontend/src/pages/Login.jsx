import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)' }}>
      {/* Left */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '15%', left: '5%', width: 320, height: 320, borderRadius: '50%', background: 'rgba(67,97,238,0.07)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(6,214,160,0.05)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 440, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '2rem' }}>📉</span>
            <span className="font-display" style={{ fontWeight: 700, fontSize: '1.7rem', color: 'var(--blue)' }}>Investo</span>
          </div>

          <h1 className="font-display" style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Sign in to your trading account</p>

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem', fontSize: '0.95rem', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>Create one</Link>
          </p>


          <div style={{ marginTop: '1rem', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <a href="/admin/login" style={{ color: 'var(--red)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>
              🛡️ Admin Login
            </a>
          </div>

          <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
            🎯 Register to get ₹10,00,000 virtual money instantly!
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ maxWidth: 380 }}>
          <h2 className="font-display" style={{ fontSize: '1.4rem', marginBottom: '2rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            India's best virtual stock simulator
          </h2>
          {[
            { icon: '💰', title: '₹10 Lakh Virtual Cash', desc: 'Start trading immediately with virtual money' },
            { icon: '📈', title: 'Real NSE Market Data', desc: 'Live Market Data' },
            { icon: '🏆', title: 'Monthly Competitions', desc: 'Compete with traders across India' },
            { icon: '📊', title: 'Portfolio Analytics', desc: 'Charts, P&L tracking, and reports' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{f.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
