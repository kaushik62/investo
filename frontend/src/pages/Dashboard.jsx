import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMarket } from '../context/MarketContext'
import { stockAPI } from '../services/api'
import Spinner from '../components/common/Spinner'

function StatCard({ label, value, sub, subColor, icon, accent }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      </div>
      <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 8, color: accent }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: subColor || 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function MiniStockCard({ stock, accentColor }) {
  const pct = stock.changePercent ?? 0
  const chg = stock.change ?? 0
  return (
    <Link to={`/stock/${stock.symbol}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '0.9rem', borderLeft: `3px solid ${accentColor}`, cursor: 'pointer',
        transition: 'transform 0.15s',
      }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{stock.symbol?.replace('.NS', '')}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: 2 }}>{stock.name?.slice(0, 22)}</div>
          </div>
          <span style={{ color: accentColor, fontSize: '0.78rem', fontWeight: 700 }}>
            {pct >= 0 ? '▲' : '▼'}{Math.abs(pct).toFixed(2)}%
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="font-mono" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            ₹{stock.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ color: accentColor, fontSize: '0.78rem' }}>
            {chg >= 0 ? '+' : ''}₹{chg.toFixed(2)}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { stocks, nifty } = useMarket()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (stocks.length > 0) { setLoading(false); return }
    stockAPI.getOverview().then(() => setLoading(false)).catch(() => setLoading(false))
  }, [stocks])

  const sorted = [...stocks].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
  const gainers = sorted.filter((s) => (s.changePercent ?? 0) > 0).slice(0, 4)
  const losers = [...sorted].reverse().filter((s) => (s.changePercent ?? 0) < 0).slice(0, 4)
  const active = [...stocks].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 4)

  if (loading) return <Spinner text="Loading market data…" />

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 700 }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Here's what's happening in Indian markets today</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Wallet Balance" icon="💰"
          value={`₹${user?.walletBalance?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          accent="var(--blue)" />
        <StatCard label="NIFTY 50" icon="📊"
          value={nifty ? `₹${nifty.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
          sub={nifty ? `${nifty.changePercent >= 0 ? '+' : ''}${nifty.changePercent?.toFixed(2)}%` : ''}
          subColor={nifty?.changePercent >= 0 ? 'var(--green)' : 'var(--red)'}
          accent={nifty?.changePercent >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatCard label="Stocks Tracked" icon="📈" value={stocks.length} accent="var(--gold)" />
        <StatCard label="Plan" icon="🎯"
          value={user?.subscription?.plan === 'premium' ? 'Premium ⭐' : 'Free'}
          accent={user?.subscription?.plan === 'premium' ? 'var(--gold)' : 'var(--text-secondary)'} />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { to: '/market',      label: '📊 Browse Stocks' },
          { to: '/portfolio',   label: '💼 Portfolio' },
          { to: '/leaderboard', label: '🏆 Leaderboard' },
          { to: '/watchlist',   label: '👁️ Watchlist' },
        ].map((a) => (
          <Link key={a.to} to={a.to}>
            <button className="btn btn-ghost" style={{ fontSize: '0.84rem' }}>{a.label}</button>
          </Link>
        ))}
      </div>

      {/* Market sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Gainers */}
        <div className="card">
          <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', gap: 6 }}>
            <span style={{ color: 'var(--green)' }}>▲</span> Top Gainers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gainers.length ? gainers.map((s) => <MiniStockCard key={s.symbol} stock={s} accentColor="var(--green)" />) : <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p>}
          </div>
        </div>

        {/* Losers */}
        <div className="card">
          <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', gap: 6 }}>
            <span style={{ color: 'var(--red)' }}>▼</span> Top Losers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {losers.length ? losers.map((s) => <MiniStockCard key={s.symbol} stock={s} accentColor="var(--red)" />) : <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p>}
          </div>
        </div>

        {/* Most Active */}
        <div className="card">
          <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>⚡ Most Active</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.map((s) => (
              <Link to={`/stock/${s.symbol}`} key={s.symbol} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.symbol?.replace('.NS', '')}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Vol: {((s.volume ?? 0) / 1e6).toFixed(1)}M</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 600 }}>₹{s.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: '0.75rem', color: (s.changePercent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {(s.changePercent ?? 0) >= 0 ? '+' : ''}{(s.changePercent ?? 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* All Stocks table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="font-display" style={{ fontWeight: 600 }}>📋 All Stocks</h3>
          <Link to="/market"><button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: '0.8rem' }}>View All</button></Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Symbol', 'Company', 'Price', 'Change', '%', 'Volume', ''].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stocks.slice(0, 10).map((s) => (
                <tr key={s.symbol} className="table-row" style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}>
                  <td style={{ padding: '10px', fontWeight: 700 }}>{s.symbol?.replace('.NS', '')}</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  </td>
                  <td style={{ padding: '10px' }} className="font-mono">₹{s.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '10px', color: (s.change ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }} className="font-mono">
                    {(s.change ?? 0) >= 0 ? '+' : ''}₹{(s.change ?? 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span className={`badge ${(s.changePercent ?? 0) >= 0 ? 'badge-green' : 'badge-red'}`}>
                      {(s.changePercent ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(s.changePercent ?? 0).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }} className="font-mono">
                    {((s.volume ?? 0) / 1e6).toFixed(2)}M
                  </td>
                  <td style={{ padding: '10px' }}>
                    <Link to={`/stock/${s.symbol}`}>
                      <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>Trade</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
