import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { stripeAPI } from '../services/api'

export default function Subscription() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const isPremium = user?.subscription?.plan === 'premium' && user?.subscription?.status === 'active'

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const r = await stripeAPI.createCheckout()
      if (r.data.data?.url) window.location.href = r.data.data.url
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start checkout')
    } finally { setLoading(false) }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel your Premium subscription?')) return
    setCancelLoading(true)
    try {
      await stripeAPI.cancelSubscription()
      await refreshUser()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel')
    } finally { setCancelLoading(false) }
  }

  const plans = [
    {
      name: 'Free', price: '₹0', period: 'forever', color: 'var(--blue)',
      features: [
        { ok: true,  text: '₹10 Lakh virtual money' },
        { ok: true,  text: '1 Watchlist (10 stocks)' },
        { ok: true,  text: 'Basic portfolio view' },
        { ok: true,  text: 'Trade history' },
        { ok: true,  text: 'Leaderboard access' },
        { ok: false, text: 'Multiple watchlists' },
        { ok: false, text: 'Portfolio PDF reports' },
        { ok: false, text: 'CSV export' },
        { ok: false, text: 'Advanced analytics' },
        { ok: false, text: 'AI insights' },
      ],
    },
    {
      name: 'Premium', price: '₹999', period: '/month', color: 'var(--gold)',
      features: [
        { ok: true, text: 'Everything in Free' },
        { ok: true, text: 'Unlimited watchlists' },
        { ok: true, text: 'Portfolio PDF reports' },
        { ok: true, text: 'CSV transaction export' },
        { ok: true, text: 'Advanced charts' },
        { ok: true, text: 'Priority support' },
        { ok: true, text: 'Competition insights' },
        { ok: true, text: 'AI trade suggestions' },
        { ok: true, text: 'Unlimited price alerts' },
        { ok: true, text: 'Early access to features' },
      ],
    },
  ]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700 }}>⭐ Subscription Plans</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>Unlock the full power of Investo</p>
        {isPremium && (
          <div style={{ display: 'inline-block', marginTop: '1rem', padding: '7px 18px', background: 'rgba(255,209,102,0.12)', border: '1px solid rgba(255,209,102,0.28)', borderRadius: 20, color: 'var(--gold)', fontWeight: 600, fontSize: '0.875rem' }}>
            ⭐ You are on Premium
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {plans.map((plan) => {
          const isCurrent = plan.name === 'Free' ? !isPremium : isPremium
          return (
            <div key={plan.name} style={{
              background: 'var(--bg-card)', borderRadius: 16,
              border: `2px solid ${plan.name === 'Premium' ? plan.color : 'var(--border)'}`,
              padding: '1.75rem', position: 'relative', overflow: 'hidden',
            }}>
              {plan.name === 'Premium' && (
                <div style={{
                  position: 'absolute', top: 14, right: -22, background: 'var(--gold)',
                  color: '#0d0d1a', padding: '3px 30px', transform: 'rotate(45deg)',
                  fontSize: '0.7rem', fontWeight: 800,
                }}>BEST</div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: plan.color }}>{plan.name}</h2>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span className="font-display" style={{ fontSize: '1.9rem', fontWeight: 700 }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{plan.period}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: '1.75rem' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', color: f.ok ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    <span>{f.ok ? '✅' : '❌'}</span>
                    {f.text}
                  </div>
                ))}
              </div>

              {plan.name === 'Free' ? (
                <button disabled style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  {!isPremium ? '✓ Current Plan' : 'Downgrade'}
                </button>
              ) : isPremium ? (
                <button onClick={handleCancel} disabled={cancelLoading} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'rgba(239,35,60,0.1)', border: '1px solid rgba(239,35,60,0.28)', color: 'var(--red)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                  {cancelLoading ? 'Canceling…' : 'Cancel Subscription'}
                </button>
              ) : (
                <button onClick={handleUpgrade} disabled={loading} style={{
                  width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--gold), #f0a500)',
                  color: '#0d0d1a', fontWeight: 700, fontSize: '1rem',
                }}>
                  {loading ? 'Redirecting…' : '⭐ Upgrade to Premium'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="alert alert-info" style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.84rem' }}>
        🔒 Secure payments via Stripe · Cancel anytime · Virtual trading only — no real money
      </div>
    </div>
  )
}
