import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMarket } from '../../context/MarketContext'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/market',       label: 'Market' },
  { to: '/portfolio',    label: 'Portfolio' },
  { to: '/watchlist',    label: 'Watchlist' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/leaderboard',  label: 'Leaderboard' },
]

// Icon map for notification types
const NOTIF_ICONS = {
  trade:       '📊',
  alert:       '🔔',
  competition: '🏆',
  subscription:'⭐',
  system:      '📢',
}

// Relative time formatter
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'Just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function Navbar() {
  const { user, logout }    = useAuth()
  const { nifty, connected, toasts, dismissToast, dataSource,
          notifications, unreadCount, markAllRead, markOneRead } = useMarket()
  const { pathname } = useLocation()
  const navigate     = useNavigate()

  const [menu,          setMenu]          = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const notifRef = useRef(null)
  const menuRef  = useRef(null)

  const isActive = (to) => pathname === to || pathname.startsWith(to + '/')
  const isLive   = dataSource === 'live'

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotifOpen = () => {
    setNotifOpen(v => !v)
    setMenu(false)
  }

  const handleMenuOpen = () => {
    setMenu(v => !v)
    setNotifOpen(false)
  }

  return (
    <>
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1.5rem', height: 58, display: 'flex', alignItems: 'center', gap: '1rem' }}>

          {/* Logo */}
          <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <span style={{ fontSize: '1.35rem' }}>📉</span>
            <span className="font-display" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--blue)' }}>Investo</span>
          </Link>

          {/* NIFTY chip */}
          {nifty && (
            <div style={{ padding: '3px 10px', background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>NIFTY 50</span>
              <span className="font-mono" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                {nifty.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: (nifty.changePercent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {(nifty.changePercent ?? 0) >= 0 ? '▲' : '▼'}{Math.abs(nifty.changePercent ?? 0).toFixed(2)}%
              </span>
            </div>
          )}

          {/* Nav links */}
          <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
            {NAV.map(n => (
              <Link key={n.to} to={n.to} style={{
                textDecoration: 'none', padding: '5px 10px', borderRadius: 8, fontSize: '0.83rem',
                fontWeight: isActive(n.to) ? 600 : 400, whiteSpace: 'nowrap',
                color:      isActive(n.to) ? 'var(--blue)' : 'var(--text-secondary)',
                background: isActive(n.to) ? 'rgba(67,97,238,0.1)' : 'transparent',
                transition: 'all 0.15s',
              }}>{n.label}</Link>
            ))}
          </div>

          {/* Right section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {/* Live/Mock badge */}
            <div title={isLive ? 'Live prices from Alpha Vantage' : 'Mock prices — add ALPHA_VANTAGE_KEY to .env'} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px',
              borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, cursor: 'default',
              background: isLive ? 'rgba(6,214,160,0.1)' : 'rgba(255,209,102,0.1)',
              border:     `1px solid ${isLive ? 'rgba(6,214,160,0.22)' : 'rgba(255,209,102,0.22)'}`,
              color:      isLive ? 'var(--green)' : 'var(--gold)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? 'var(--green)' : 'var(--gold)', boxShadow: isLive ? '0 0 5px var(--green)' : 'none', display: 'inline-block' }} />
              {isLive ? 'LIVE' : 'MOCK'}
            </div>

            {/* Socket dot */}
            <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: connected ? 'var(--green)' : '#555', boxShadow: connected ? '0 0 6px var(--green)' : 'none' }} title={connected ? 'Real-time active' : 'Disconnected'} />

            {/* ── Notification Bell ─────────────────────────── */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={handleNotifOpen}
                title="Notifications"
                style={{
                  position: 'relative', background: notifOpen ? 'var(--bg-elevated)' : 'transparent',
                  border: notifOpen ? '1px solid var(--border)' : '1px solid transparent',
                  borderRadius: 9, width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s', fontSize: '1rem',
                }}
              >
                🔔
                {/* Unread badge */}
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                    background: 'var(--red)', color: '#fff',
                    fontSize: '0.6rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, border: '2px solid var(--bg-card)',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <div className="animate-fade-in" style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 360, maxHeight: 480,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  zIndex: 200, display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, padding: '2px 6px', borderRadius: 6 }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔕</div>
                        <p style={{ fontSize: '0.875rem', margin: 0 }}>No notifications yet</p>
                        <p style={{ fontSize: '0.78rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                          Admin broadcasts and price alerts will appear here
                        </p>
                      </div>
                    ) : (
                      notifications.map((n, i) => (
                        <div
                          key={n._id || i}
                          onClick={() => { if (!n.read) markOneRead(n._id) }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                            cursor: n.read ? 'default' : 'pointer',
                            background: n.read ? 'transparent' : 'rgba(67,97,238,0.04)',
                            transition: 'background 0.15s',
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                          }}
                          onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = 'rgba(67,97,238,0.08)' }}
                          onMouseLeave={e => { if (!n.read) e.currentTarget.style.background = 'rgba(67,97,238,0.04)' }}
                        >
                          {/* Type icon */}
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: getNotifBg(n.type),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem',
                          }}>
                            {NOTIF_ICONS[n.type] || '📢'}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              margin: 0, fontSize: '0.84rem',
                              color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)',
                              lineHeight: 1.45,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            }}>
                              {n.message}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                {timeAgo(n.createdAt)}
                              </span>
                              <span className={`badge badge-${getNotifBadge(n.type)}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                                {n.type}
                              </span>
                            </div>
                          </div>

                          {/* Unread dot */}
                          {!n.read && (
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, marginTop: 6 }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {notifications.length} notification{notifications.length !== 1 ? 's' : ''} total
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── User menu ─────────────────────────────────── */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={handleMenuOpen} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 9, padding: '5px 10px', cursor: 'pointer', color: 'var(--text-primary)',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#4361ee,#06d6a0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8rem', color: '#fff',
                }}>{user?.name?.[0]?.toUpperCase()}</div>
                <span style={{ fontSize: '0.84rem', fontWeight: 500 }}>{user?.name?.split(' ')[0]}</span>
                {user?.subscription?.plan === 'premium' && (
                  <span className="badge badge-gold" style={{ fontSize: '0.62rem' }}>PRO</span>
                )}
              </button>

              {menu && (
                <div className="animate-fade-in" style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 8, minWidth: 195, zIndex: 200,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      ₹{user?.walletBalance?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  {[
                    { to: '/profile',      label: '👤 Profile' },
                    { to: '/subscription', label: '⭐ Subscription' },
                    ...(user?.role === 'admin' ? [{ to: '/admin', label: '🛡️ Admin' }] : []),
                  ].map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setMenu(false)} style={{
                      display: 'block', padding: '7px 12px', borderRadius: 8, textDecoration: 'none',
                      color: 'var(--text-primary)', fontSize: '0.84rem', transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{item.label}</Link>
                  ))}
                  <button onClick={() => { logout(); navigate('/login'); setMenu(false) }} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 12px', borderRadius: 8, background: 'none', border: 'none',
                    color: 'var(--red)', cursor: 'pointer', fontSize: '0.84rem', marginTop: 4,
                  }}>🚪 Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Toast popups (bottom-right, auto-dismiss) ──────── */}
      <div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 999, display: 'flex', flexDirection: 'column-reverse', gap: 8, maxWidth: 340 }}>
        {toasts.map(t => (
          <div
            key={t.toastId}
            className="animate-slide-up"
            onClick={() => dismissToast(t.toastId)}
            style={{
              background: 'var(--bg-elevated)', border: `1px solid ${getNotifBorderColor(t.type)}`,
              borderLeft: `3px solid ${getNotifAccentColor(t.type)}`,
              borderRadius: 12, padding: '12px 14px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
              cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{NOTIF_ICONS[t.type] || '📢'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.45, color: 'var(--text-primary)' }}>
                {t.message}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Click to dismiss
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function getNotifBg(type) {
  const map = { trade:'rgba(6,214,160,0.12)', alert:'rgba(255,209,102,0.12)', competition:'rgba(239,35,60,0.12)', subscription:'rgba(255,209,102,0.12)', system:'rgba(67,97,238,0.12)' }
  return map[type] || 'rgba(67,97,238,0.12)'
}
function getNotifBadge(type) {
  const map = { trade:'green', alert:'gold', competition:'red', subscription:'gold', system:'blue' }
  return map[type] || 'blue'
}
function getNotifAccentColor(type) {
  const map = { trade:'var(--green)', alert:'var(--gold)', competition:'var(--red)', subscription:'var(--gold)', system:'var(--blue)' }
  return map[type] || 'var(--blue)'
}
function getNotifBorderColor(type) {
  const map = { trade:'rgba(6,214,160,0.25)', alert:'rgba(255,209,102,0.25)', competition:'rgba(239,35,60,0.25)', subscription:'rgba(255,209,102,0.25)', system:'rgba(67,97,238,0.25)' }
  return map[type] || 'var(--border)'
}
