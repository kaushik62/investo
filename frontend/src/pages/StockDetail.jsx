import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { stockAPI, tradeAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useMarket } from '../context/MarketContext'
import Spinner from '../components/common/Spinner'

const TF = [{ k: '1d', l: '1D' }, { k: '1wk', l: '1W' }, { k: '1mo', l: '1M' }, { k: '6mo', l: '6M' }, { k: '1y', l: '1Y' }]

export default function StockDetail() {
  const { symbol } = useParams()
  const { user, refreshUser } = useAuth()
  const { getPrice } = useMarket()

  const [stock, setStock] = useState(null)
  const [history, setHistory] = useState([])
  const [tf, setTf] = useState('1mo')
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [mode, setMode] = useState('BUY')
  const [qty, setQty] = useState('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    setLoading(true)
    stockAPI.getDetails(symbol).then((r) => setStock(r.data.data)).catch(console.error).finally(() => setLoading(false))
  }, [symbol])

  useEffect(() => {
    setChartLoading(true)
    stockAPI.getHistory(symbol, tf).then((r) => {
      setHistory(r.data.data.map((d) => ({ ...d, value: d.close, date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) })))
    }).catch(console.error).finally(() => setChartLoading(false))
  }, [symbol, tf])

  const livePrice = getPrice(symbol) ?? stock?.price ?? 0
  const totalCost = qty ? (livePrice * parseInt(qty || 0)) : 0
  const chartColor = (stock?.changePercent ?? 0) >= 0 ? '#06d6a0' : '#ef233c'
  const minVal = history.length ? Math.min(...history.map((d) => d.value)) * 0.998 : 0
  const maxVal = history.length ? Math.max(...history.map((d) => d.value)) * 1.002 : 0

  const handleTrade = async () => {
    if (!qty || parseInt(qty) <= 0) return setMsg({ type: 'error', text: 'Enter a valid quantity' })
    setTradeLoading(true); setMsg(null)
    try {
      const fn = mode === 'BUY' ? tradeAPI.buy : tradeAPI.sell
      const res = await fn({ symbol, quantity: parseInt(qty) })
      setMsg({ type: 'success', text: res.data.message })
      setQty('')
      await refreshUser()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Trade failed' })
    } finally {
      setTradeLoading(false)
    }
  }

  if (loading) return <Spinner text="Loading stock data…" />
  if (!stock) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Stock not found</div>

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left */}
        <div>
          {/* Header */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700 }}>{symbol?.replace('.NS', '')}</h1>
                  <span className="badge badge-blue">{stock.exchange || 'NSE'}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{stock.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="font-display" style={{ fontSize: '2rem', fontWeight: 700 }}>
                  ₹{livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontWeight: 700, color: (stock.changePercent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {(stock.change ?? 0) >= 0 ? '+' : ''}₹{(stock.change ?? 0).toFixed(2)} ({(stock.changePercent ?? 0).toFixed(2)}%)
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10, marginTop: '1.25rem' }}>
              {[
                { label: 'Open',         value: `₹${(stock.open ?? 0).toFixed(2)}` },
                { label: 'Day High',     value: `₹${(stock.high ?? 0).toFixed(2)}`,             color: 'var(--green)' },
                { label: 'Day Low',      value: `₹${(stock.low ?? 0).toFixed(2)}`,              color: 'var(--red)' },
                { label: 'Prev Close',   value: `₹${(stock.previousClose ?? 0).toFixed(2)}` },
                { label: 'Volume',       value: `${((stock.volume ?? 0) / 1e6).toFixed(1)}M` },
                { label: '52W High',     value: `₹${(stock.fiftyTwoWeekHigh ?? 0).toFixed(2)}`, color: 'var(--green)' },
                { label: '52W Low',      value: `₹${(stock.fiftyTwoWeekLow ?? 0).toFixed(2)}`,  color: 'var(--red)' },
                { label: 'Market Cap',   value: stock.marketCap ? `₹${(stock.marketCap / 1e9).toFixed(0)}B` : 'N/A' },
              ].map((s) => (
                <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '9px 10px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{s.label}</div>
                  <div className="font-mono" style={{ fontWeight: 600, fontSize: '0.875rem', color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="font-display" style={{ fontWeight: 600 }}>Price Chart</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {TF.map((t) => (
                  <button key={t.k} onClick={() => setTf(t.k)} style={{
                    padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                    background: tf === t.k ? 'var(--blue)' : 'var(--bg-elevated)',
                    color: tf === t.k ? '#fff' : 'var(--text-secondary)',
                  }}>{t.l}</button>
                ))}
              </div>
            </div>
            {chartLoading ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 30, height: 30 }} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartColor} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[minVal, maxVal]} tick={{ fontSize: 10, fill: '#666' }} tickLine={false} width={72}
                    tickFormatter={(v) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
                  <Tooltip
                    formatter={(v) => [`₹${v?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Price']}
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill="url(#grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trade Panel */}
        <div style={{ position: 'sticky', top: 76 }}>
          <div className="card-elevated">
            <h3 className="font-display" style={{ fontWeight: 700, marginBottom: '1.25rem' }}>Trade {symbol?.replace('.NS', '')}</h3>

            {/* Mode toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 10, padding: 4, marginBottom: '1.25rem' }}>
              {['BUY', 'SELL'].map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.18s',
                  background: mode === m ? (m === 'BUY' ? 'var(--green)' : 'var(--red)') : 'transparent',
                  color: mode === m ? (m === 'BUY' ? '#0d0d1a' : '#fff') : 'var(--text-secondary)',
                }}>{m}</button>
              ))}
            </div>

            {/* CMP */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px', marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Current Price</div>
              <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                ₹{livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Qty */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Quantity</label>
              <input className="input" type="number" min="1" placeholder="Enter shares" value={qty}
                onChange={(e) => setQty(e.target.value)} style={{ fontSize: '1rem' }} />
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Total</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>
                  {qty ? `₹${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Available</span>
                <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--green)' }}>
                  ₹{user?.walletBalance?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {msg && (
              <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
                {msg.text}
              </div>
            )}

            <button
              onClick={handleTrade}
              disabled={tradeLoading || !qty}
              className={`btn ${mode === 'BUY' ? 'btn-success' : 'btn-danger'}`}
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            >
              {tradeLoading ? 'Processing…' : `${mode} ${qty ? `${qty} Shares` : 'Shares'}`}
            </button>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', textAlign: 'center', marginTop: 12 }}>
              🔒 Virtual trading only. No real money.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
