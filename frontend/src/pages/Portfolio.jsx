import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { portfolioAPI, exportAPI } from '../services/api'
import Spinner from '../components/common/Spinner'

const COLORS = ['#4361ee','#06d6a0','#ffd166','#ef233c','#118ab2','#7b2d8b','#f77f00','#2ec4b6','#e71d36','#ff9f1c']

export default function Portfolio() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    portfolioAPI.get().then((r) => setData(r.data.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await exportAPI.downloadPDF()
      if (r.data.data?.url) window.open(r.data.data.url, '_blank')
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.error || err.message))
    } finally { setExporting(false) }
  }

  if (loading) return <Spinner text="Loading portfolio…" />

  const { holdings = [], totalInvested = 0, currentValue = 0, unrealizedPL = 0, realizedPL = 0, plPercent = 0, walletBalance = 0 } = data || {}

  const pieData = holdings.map((h, i) => ({ name: h.symbol.replace('.NS',''), value: +(h.holdingValue ?? 0).toFixed(2), color: COLORS[i % COLORS.length] }))

  const stats = [
    { label: 'Total Invested',   value: `₹${totalInvested.toLocaleString('en-IN',{maximumFractionDigits:0})}`,    color: 'var(--blue)' },
    { label: 'Unrealized P&L',  value: `${unrealizedPL>=0?'+':''}₹${unrealizedPL.toLocaleString('en-IN',{maximumFractionDigits:0})}`, color: unrealizedPL>=0?'var(--green)':'var(--red)' },
    { label: 'Realized P&L',    value: `${realizedPL>=0?'+':''}₹${realizedPL.toLocaleString('en-IN',{maximumFractionDigits:0})}`,    color: realizedPL>=0?'var(--green)':'var(--red)' },
    { label: 'Return %',        value: `${plPercent>=0?'+':''}${plPercent.toFixed(2)}%`,                          color: plPercent>=0?'var(--green)':'var(--red)' },
    { label: 'Wallet Balance',  value: `₹${walletBalance.toLocaleString('en-IN',{maximumFractionDigits:0})}`,     color: 'var(--gold)' },
    { label: 'Total Value',     value: `₹${currentValue.toLocaleString('en-IN',{maximumFractionDigits:0})}`,      color: 'var(--blue)' },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 700 }}>💼 Portfolio</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{holdings.length} holdings</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Generating…' : '📄 Export PDF'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.label}</div>
            <div className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 8, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {holdings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h3 className="font-display" style={{ marginBottom: 8 }}>No Holdings Yet</h3>
          <p>Buy some stocks to build your portfolio!</p>
          <Link to="/market"><button className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Stocks →</button></Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Holdings table */}
          <div className="card">
            <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>Holdings</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Stock','Qty','Avg','CMP','Invested','Current','P&L','%',''].map((h) => (
                      <th key={h} style={{ padding: '8px 9px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.symbol} className="table-row" style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}>
                      <td style={{ padding: '11px 9px' }}>
                        <div style={{ fontWeight: 700 }}>{h.symbol.replace('.NS','')}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{h.companyName?.slice(0,16)}</div>
                      </td>
                      <td className="font-mono" style={{ padding: '11px 9px' }}>{h.quantity}</td>
                      <td className="font-mono" style={{ padding: '11px 9px' }}>₹{(h.averageBuyPrice ?? 0).toFixed(2)}</td>
                      <td className="font-mono" style={{ padding: '11px 9px', fontWeight: 600 }}>₹{(h.currentPrice ?? 0).toFixed(2)}</td>
                      <td className="font-mono" style={{ padding: '11px 9px' }}>₹{(h.invested ?? 0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td className="font-mono" style={{ padding: '11px 9px' }}>₹{(h.holdingValue ?? 0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td className="font-mono" style={{ padding: '11px 9px', color: (h.pl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {(h.pl ?? 0) >= 0 ? '+' : ''}₹{(h.pl ?? 0).toFixed(0)}
                      </td>
                      <td style={{ padding: '11px 9px' }}>
                        <span className={`badge ${(h.plPercent ?? 0) >= 0 ? 'badge-green' : 'badge-red'}`}>
                          {(h.plPercent ?? 0) >= 0 ? '▲' : '▼'}{Math.abs(h.plPercent ?? 0)}%
                        </span>
                      </td>
                      <td style={{ padding: '11px 9px' }}>
                        <Link to={`/stock/${h.symbol}`}><button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Trade</button></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pie */}
          <div className="card">
            <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>Allocation</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Value']}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend formatter={(v) => <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '0.75rem' }}>
              {pieData.map((p, i) => {
                const total = pieData.reduce((s, d) => s + d.value, 0)
                const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < pieData.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem' }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
