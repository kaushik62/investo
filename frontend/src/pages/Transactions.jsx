import { useState, useEffect } from 'react'
import { transactionAPI, exportAPI } from '../services/api'
import Spinner from '../components/common/Spinner'

export default function Transactions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    transactionAPI.get({ type: filter !== 'ALL' ? filter : undefined, symbol: search || undefined, page, limit: 20 })
      .then((r) => { setRows(r.data.data); setPagination(r.data.pagination) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter, search, page])

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await exportAPI.downloadCSV()
      if (r.data.data?.url) window.open(r.data.data.url, '_blank')
    } catch (err) { alert('Export failed: ' + (err.response?.data?.error || err.message)) }
    finally { setExporting(false) }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 700 }}>📋 Transactions</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{pagination?.total ?? 0} total trades</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : '📥 Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 10, padding: 4 }}>
          {['ALL','BUY','SELL'].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.84rem', transition: 'all 0.15s',
              background: filter === f ? 'var(--blue)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
            }}>{f}</button>
          ))}
        </div>
        <input className="input" placeholder="🔍 Symbol…" value={search}
          onChange={(e) => { setSearch(e.target.value.toUpperCase()); setPage(1) }} style={{ maxWidth: 180 }} />
      </div>

      <div className="card">
        {loading ? <Spinner text="Loading…" /> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date','Stock','Type','Qty','Price','Total','P&L','Status'].map((h) => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No transactions found</td></tr>
                  ) : rows.map((t) => (
                    <tr key={t._id} className="table-row" style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}>
                      <td style={{ padding: '11px 10px', color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        <div>{new Date(t.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
                        <div>{new Date(t.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                      </td>
                      <td style={{ padding: '11px 10px' }}>
                        <div style={{ fontWeight: 700 }}>{t.symbol.replace('.NS','')}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{t.companyName?.slice(0,16)}</div>
                      </td>
                      <td style={{ padding: '11px 10px' }}>
                        <span className={`badge ${t.transactionType === 'BUY' ? 'badge-green' : 'badge-red'}`}>
                          {t.transactionType === 'BUY' ? '▲ BUY' : '▼ SELL'}
                        </span>
                      </td>
                      <td className="font-mono" style={{ padding: '11px 10px' }}>{t.quantity}</td>
                      <td className="font-mono" style={{ padding: '11px 10px' }}>₹{(t.price ?? 0).toFixed(2)}</td>
                      <td className="font-mono" style={{ padding: '11px 10px', fontWeight: 600 }}>₹{(t.totalAmount ?? 0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td className="font-mono" style={{ padding: '11px 10px', color: (t.profitLoss ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {t.transactionType === 'SELL' ? `${(t.profitLoss ?? 0) >= 0 ? '+' : ''}₹${(t.profitLoss ?? 0).toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: '11px 10px' }}><span className="badge badge-green">{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: '1.25rem' }}>
                <button className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Page {page} of {pagination.pages}</span>
                <button className="btn btn-ghost" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
