import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarket } from '../context/MarketContext'

export default function Market() {
  const { stocks } = useMarket()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('volume')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = stocks
    .filter((s) => s.symbol?.includes(search.toUpperCase()) || s.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => ((a[sortKey] ?? 0) - (b[sortKey] ?? 0)) * (sortDir === 'desc' ? -1 : 1))

  const Arrow = ({ k }) => sortKey === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 700 }}>📊 Market</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>NSE listed stocks · Live prices</p>
        </div>
        <input className="input" placeholder="🔍 Search stocks…" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 250 }} />
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total',    value: stocks.length,                                      color: 'var(--blue)' },
          { label: 'Gainers',  value: stocks.filter((s) => (s.changePercent ?? 0) > 0).length,  color: 'var(--green)' },
          { label: 'Losers',   value: stocks.filter((s) => (s.changePercent ?? 0) < 0).length,  color: 'var(--red)' },
          { label: 'Unchanged',value: stocks.filter((s) => (s.changePercent ?? 0) === 0).length, color: 'var(--text-secondary)' },
        ].map((s) => (
          <div key={s.label} className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.label}</div>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 6, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  { k: null,          label: 'Symbol' },
                  { k: null,          label: 'Company' },
                  { k: 'price',       label: 'Price' },
                  { k: 'change',      label: 'Change' },
                  { k: 'changePercent', label: '%' },
                  { k: 'volume',      label: 'Volume' },
                  { k: 'high',        label: 'High' },
                  { k: 'low',         label: 'Low' },
                  { k: 'marketCap',   label: 'Mkt Cap' },
                  { k: null,          label: '' },
                ].map(({ k, label }) => (
                  <th key={label} onClick={() => k && handleSort(k)} style={{
                    padding: '9px 10px', textAlign: 'left', color: 'var(--text-secondary)',
                    fontSize: '0.78rem', fontWeight: 500, cursor: k ? 'pointer' : 'default',
                    userSelect: 'none', whiteSpace: 'nowrap',
                  }}>
                    {label}{k && <Arrow k={k} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  {stocks.length === 0 ? 'Loading market data…' : 'No stocks match your search'}
                </td></tr>
              ) : filtered.map((s) => (
                <tr key={s.symbol} className="table-row" style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}>
                  <td style={{ padding: '11px 10px', fontWeight: 700 }}>{s.symbol?.replace('.NS', '')}</td>
                  <td style={{ padding: '11px 10px', color: 'var(--text-secondary)', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  </td>
                  <td style={{ padding: '11px 10px' }} className="font-mono">₹{s.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '11px 10px', color: (s.change ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }} className="font-mono">
                    {(s.change ?? 0) >= 0 ? '+' : ''}₹{(s.change ?? 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '11px 10px' }}>
                    <span className={`badge ${(s.changePercent ?? 0) >= 0 ? 'badge-green' : 'badge-red'}`}>
                      {(s.changePercent ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(s.changePercent ?? 0).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ padding: '11px 10px', color: 'var(--text-secondary)' }} className="font-mono">{((s.volume ?? 0) / 1e6).toFixed(2)}M</td>
                  <td style={{ padding: '11px 10px', color: 'var(--green)' }} className="font-mono">₹{(s.high ?? 0).toFixed(2)}</td>
                  <td style={{ padding: '11px 10px', color: 'var(--red)' }} className="font-mono">₹{(s.low ?? 0).toFixed(2)}</td>
                  <td style={{ padding: '11px 10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {s.marketCap ? `₹${(s.marketCap / 1e9).toFixed(0)}B` : '—'}
                  </td>
                  <td style={{ padding: '11px 10px' }}>
                    <Link to={`/stock/${s.symbol}`}>
                      <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>Trade</button>
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
