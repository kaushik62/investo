import { useMarket } from '../../context/MarketContext'

export default function StockTicker() {
  const { stocks } = useMarket()
  if (!stocks.length) return null

  const items = [...stocks, ...stocks]

  return (
    <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '6px 0', overflow: 'hidden' }}>
      <div className="ticker-track">
        {items.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 20px', fontSize: '0.78rem' }}>
            <span style={{ fontWeight: 700 }}>{s.symbol?.replace('.NS', '')}</span>
            <span className="font-mono">₹{s.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span style={{ color: (s.changePercent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {(s.changePercent ?? 0) >= 0 ? '▲' : '▼'}{Math.abs(s.changePercent ?? 0).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
