import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { watchlistAPI, stockAPI } from '../services/api'
import Spinner from '../components/common/Spinner'

const ALL_STOCKS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'LT.NS', 'AXISBANK.NS', 'WIPRO.NS', 'HCLTECH.NS', 'ASIANPAINT.NS',
]

export default function Watchlist() {
  const [watchlists, setWatchlists] = useState([])
  const [selIdx,     setSelIdx]     = useState(0)
  const [msg,        setMsg]        = useState(null)

  const { isLoading: loading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await watchlistAPI.get()
      setWatchlists(res.data.data)
      return res.data.data
    },
  })

  const { data: priceMap = {} } = useQuery({
    queryKey: ['stocks-overview'],
    queryFn: async () => {
      const res = await stockAPI.getOverview()
      const map = {}
      ;(res.data.data || []).forEach((s) => { map[s.symbol] = s })
      return map
    },
    refetchInterval: 10_000,
  })

  const addStock = async (symbol) => {
    const wl = watchlists[selIdx]
    if (!wl) return
    try {
      const res = await watchlistAPI.addStock(wl._id, symbol)
      setWatchlists(watchlists.map((w, i) => i === selIdx ? res.data.data : w))
      setMsg({ type: 'success', text: `Added ${symbol.replace('.NS','')} to ${wl.name}` })
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to add' })
    }
  }

  const removeStock = async (symbol) => {
    const wl = watchlists[selIdx]
    if (!wl) return
    try {
      const res = await watchlistAPI.removeStock(wl._id, symbol)
      setWatchlists(watchlists.map((w, i) => i === selIdx ? res.data.data : w))
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to remove' })
    }
  }

  if (loading) return <Spinner text="Loading watchlist…" />

  const wl = watchlists[selIdx]
  const watched = (wl?.stocks || []).map((sym) => ({ symbol: sym, ...(priceMap[sym] || {}) }))
  const available = ALL_STOCKS.filter((s) => !(wl?.stocks || []).includes(s))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 700 }}>👁️ Watchlist</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Track your favourite stocks</p>
        </div>
        <button className="btn btn-primary" onClick={async () => {
          const name = prompt('Watchlist name?')
          if (!name) return
          const r = await watchlistAPI.create(name)
          setWatchlists(r.data.data)
        }}>+ New Watchlist</button>
      </div>

      {/* Tabs */}
      {watchlists.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {watchlists.map((w, i) => (
            <button key={w._id} onClick={() => setSelIdx(i)} style={{
              padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.84rem',
              background: selIdx === i ? 'var(--blue)' : 'var(--bg-card)',
              color: selIdx === i ? '#fff' : 'var(--text-secondary)',
            }}>{w.name}</button>
          ))}
        </div>
      )}

      {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Watched */}
        <div className="card">
          <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>{wl?.name} ({watched.length})</h3>
          {watched.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>👁️</div>
              <p>No stocks yet. Add from the panel →</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {watched.map((s) => (
                <div key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.symbol.replace('.NS','')}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{s.name?.slice(0,24)}</div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 12 }}>
                    <div className="font-mono" style={{ fontWeight: 600 }}>
                      {s.price ? `₹${s.price.toLocaleString('en-IN',{minimumFractionDigits:2})}` : '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: (s.changePercent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {(s.changePercent ?? 0) >= 0 ? '+' : ''}{(s.changePercent ?? 0).toFixed(2)}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link to={`/stock/${s.symbol}`}><button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Trade</button></Link>
                    <button onClick={() => removeStock(s.symbol)} style={{ padding: '4px 8px', background: 'rgba(239,35,60,0.1)', border: '1px solid rgba(239,35,60,0.25)', borderRadius: 6, cursor: 'pointer', color: 'var(--red)', fontSize: '0.75rem' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add panel */}
        <div className="card">
          <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>Add Stocks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {available.map((sym) => {
              const s = priceMap[sym]
              return (
                <div key={sym} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{sym.replace('.NS','')}</div>
                    {s && <div style={{ fontSize: '0.72rem', color: (s.changePercent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {(s.changePercent ?? 0) >= 0 ? '+' : ''}{(s.changePercent ?? 0).toFixed(2)}%
                    </div>}
                  </div>
                  <button onClick={() => addStock(sym)} style={{ padding: '4px 10px', background: 'rgba(67,97,238,0.12)', border: '1px solid rgba(67,97,238,0.25)', borderRadius: 6, cursor: 'pointer', color: 'var(--blue)', fontSize: '0.8rem', fontWeight: 600 }}>+ Add</button>
                </div>
              )
            })}
            {available.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>All stocks added ✓</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
