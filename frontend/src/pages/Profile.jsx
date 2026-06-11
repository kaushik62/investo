import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI, notificationAPI } from '../services/api'

const SYMBOLS = ['RELIANCE.NS','TCS.NS','INFY.NS','HDFCBANK.NS','ICICIBANK.NS','SBIN.NS','TATAMOTORS.NS','LT.NS','ITC.NS','BHARTIARTL.NS']

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [alert, setAlert] = useState({ symbol: 'RELIANCE.NS', targetPrice: '', condition: 'above' })
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500) }

  const saveProfile = async (e) => {
    e.preventDefault(); setLoading(true)
    try { await authAPI.updateProfile(form); await refreshUser(); flash('Profile updated!') }
    catch (err) { flash(err.response?.data?.error || 'Update failed', 'error') }
    finally { setLoading(false) }
  }

  const changePassword = async (e) => {
    e.preventDefault(); setLoading(true)
    try { await authAPI.changePassword(pw); setPw({ currentPassword: '', newPassword: '' }); flash('Password changed!') }
    catch (err) { flash(err.response?.data?.error || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  const setPriceAlert = async (e) => {
    e.preventDefault()
    try { await notificationAPI.setPriceAlert(alert); flash(`Alert set for ${alert.symbol.replace('.NS','')}`); setAlert({ symbol: 'RELIANCE.NS', targetPrice: '', condition: 'above' }) }
    catch (err) { flash(err.response?.data?.error || 'Failed', 'error') }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 700, marginBottom: '2rem' }}>👤 My Profile</h1>

      {msg && <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '1.25rem' }}>{msg.text}</div>}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* User card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#4361ee,#06d6a0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff', fontSize: '1.6rem',
            }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user?.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{user?.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span className={`badge ${user?.subscription?.plan === 'premium' ? 'badge-gold' : 'badge-blue'}`}>
                  {user?.subscription?.plan === 'premium' ? '⭐ Premium' : 'Free Plan'}
                </span>
                {user?.role === 'admin' && <span className="badge badge-red">Admin</span>}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Wallet Balance</span>
            <span className="font-mono" style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--gold)' }}>
              ₹{user?.walletBalance?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 className="font-display" style={{ fontWeight: 600, fontSize: '1rem' }}>Edit Profile</h3>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Full Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Avatar URL (optional)</label>
              <input className="input" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="https://…" />
            </div>
            <div><button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving…' : 'Save Changes'}</button></div>
          </form>
        </div>

        {/* Change password */}
        <div className="card">
          <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>🔐 Change Password</h3>
          <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Current Password</label>
              <input className="input" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>New Password (min 6 chars)</label>
              <input className="input" type="password" value={pw.newPassword} minLength={6} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
            </div>
            <div><button type="submit" className="btn btn-primary">Update Password</button></div>
          </form>
        </div>

        {/* Price alerts */}
        <div className="card">
          <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>🔔 Set Price Alert</h3>
          <form onSubmit={setPriceAlert} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Stock</label>
              <select className="input" value={alert.symbol} onChange={(e) => setAlert({ ...alert, symbol: e.target.value })}>
                {SYMBOLS.map((s) => <option key={s} value={s}>{s.replace('.NS','')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Condition</label>
              <select className="input" value={alert.condition} onChange={(e) => setAlert({ ...alert, condition: e.target.value })}>
                <option value="above">Price Above</option>
                <option value="below">Price Below</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Target (₹)</label>
              <input className="input" type="number" step="0.01" placeholder="0.00" value={alert.targetPrice} onChange={(e) => setAlert({ ...alert, targetPrice: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary">Set</button>
          </form>
        </div>
      </div>
    </div>
  )
}
