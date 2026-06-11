import { useState, useEffect, useCallback } from 'react'
import { adminAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/common/Spinner'
import API from '../services/api'

/* ── tiny helpers ── */
const fmt  = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const fmtR = (n) => `₹${fmt(n)}`

/* ── Stat card ── */
function Stat({ label, value, sub, icon, color }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      </div>
      <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 8, color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TABS
   ══════════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'overview',     label: '📊 Overview' },
  { key: 'users',        label: '👥 Users' },
  { key: 'transactions', label: '📋 Transactions' },
  { key: 'competition',  label: '🏆 Competition' },
  { key: 'broadcast',    label: '📢 Broadcast' },
]

export default function Admin() {
  const { user: me } = useAuth()
  const [tab,   setTab]   = useState('overview')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.getStats()
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner text="Loading admin panel…" />

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="font-display" style={{ fontSize: '1.8rem', fontWeight: 700 }}>🛡️ Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Logged in as <strong style={{ color: 'var(--blue)' }}>{me?.name}</strong> · {me?.email}
        </p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Stat label="Total Users"         value={fmt(stats?.totalUsers)}          icon="👥" color="var(--blue)"  sub={`+${stats?.newUsersToday ?? 0} today`} />
        <Stat label="Total Trades"        value={fmt(stats?.totalTrades)}         icon="📊" color="var(--green)" sub={`${stats?.tradesToday ?? 0} today`} />
        <Stat label="Premium Subscribers" value={fmt(stats?.activeSubscriptions)} icon="⭐" color="var(--gold)"  sub={`${fmtR(stats?.revenue)} revenue`} />
        <Stat label="Active Competitions" value={stats?.competitions?.filter(c=>c.status==='active').length ?? 0} icon="🏆" color="var(--red)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.84rem',
            background: tab === t.key ? 'var(--blue)' : 'var(--bg-card)',
            color:      tab === t.key ? '#fff'        : 'var(--text-secondary)',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview'     && <OverviewTab    stats={stats} />}
      {tab === 'users'        && <UsersTab       adminId={me?._id} />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'competition'  && <CompetitionTab competitions={stats?.competitions ?? []} reload={() => adminAPI.getStats().then(r => setStats(r.data.data))} />}
      {tab === 'broadcast'    && <BroadcastTab />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ══════════════════════════════════════════════════════════════ */
function OverviewTab({ stats }) {
  const trades = (stats?.recentTrades || []).slice().reverse()
  const maxCount = Math.max(...trades.map(d => d.count), 1)

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Bar chart */}
      <div className="card">
        <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1.25rem' }}>📈 Daily Trading Activity (Last 7 Days)</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 130 }}>
          {trades.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{d.count}</span>
              <div style={{ width: '100%', minHeight: 4, height: `${(d.count / maxCount) * 100}%`, background: 'linear-gradient(to top, var(--blue), rgba(67,97,238,0.35))', borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {new Date(d._id).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          ))}
          {!trades.length && <p style={{ color: 'var(--text-secondary)' }}>No trade data yet</p>}
        </div>
      </div>

      {/* Top symbols */}
      <div className="card">
        <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>🔥 Most Traded Stocks</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(stats?.topSymbols || []).map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="font-mono" style={{ fontWeight: 700, color: 'var(--blue)', minWidth: 30 }}>#{i + 1}</span>
                <span style={{ fontWeight: 600 }}>{s._id?.replace('.BSE','').replace('.NS','')}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.84rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{fmt(s.count)} trades</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmtR(s.volume)}</span>
              </div>
            </div>
          ))}
          {!stats?.topSymbols?.length && <p style={{ color: 'var(--text-secondary)' }}>No data yet</p>}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   USERS TAB
   ══════════════════════════════════════════════════════════════ */
function UsersTab({ adminId }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)
  const [pagination, setPagination] = useState(null)
  const [selected, setSelected] = useState(null)  // user detail modal
  const [walletModal, setWalletModal] = useState(null)
  const [walletAmt, setWalletAmt] = useState('')
  const [walletReason, setWalletReason] = useState('')
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    adminAPI.getUsers({ search, page, limit: 15 })
      .then(r => { setUsers(r.data.data); setPagination(r.data.pagination) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, page])

  useEffect(() => { load() }, [load])

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  const toggleBlock = async (u) => {
    try {
      const r = await adminAPI.toggleUser(u._id)
      flash(r.data.message)
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isActive: !x.isActive } : x))
    } catch (err) { flash(err.response?.data?.error || 'Failed', 'error') }
  }

  const changeRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    if (!window.confirm(`Make ${u.name} a ${newRole}?`)) return
    try {
      await API.put(`/admin/users/${u._id}/role`, { role: newRole })
      flash(`${u.name} is now ${newRole}`)
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, role: newRole } : x))
    } catch (err) { flash(err.response?.data?.error || 'Failed', 'error') }
  }

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.name} and ALL their data? This cannot be undone.`)) return
    try {
      await API.delete(`/admin/users/${u._id}`)
      flash(`${u.name} deleted`)
      setUsers(prev => prev.filter(x => x._id !== u._id))
    } catch (err) { flash(err.response?.data?.error || 'Failed', 'error') }
  }

  const adjustWallet = async () => {
    if (!walletAmt) return
    try {
      const r = await API.put(`/admin/users/${walletModal._id}/wallet`, { amount: parseFloat(walletAmt), reason: walletReason })
      flash(r.data.message)
      setUsers(prev => prev.map(x => x._id === walletModal._id ? { ...x, walletBalance: r.data.data.walletBalance } : x))
      setWalletModal(null); setWalletAmt(''); setWalletReason('')
    } catch (err) { flash(err.response?.data?.error || 'Failed', 'error') }
  }

  return (
    <div>
      {msg && <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '1rem' }}>{msg.text}</div>}

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
        <input className="input" placeholder="🔍 Search by name or email…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ maxWidth: 300 }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', alignSelf: 'center' }}>
          {pagination?.total ?? 0} users
        </span>
      </div>

      {loading ? <Spinner /> : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name','Email','Wallet','Plan','Role','Status','Joined','Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 10px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4361ee,#06d6a0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.75rem', flexShrink: 0 }}>
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        {u.name}
                        {u._id === adminId && <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>YOU</span>}
                      </div>
                    </td>
                    <td style={{ padding: '11px 10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{u.email}</td>
                    <td className="font-mono" style={{ padding: '11px 10px', fontSize: '0.8rem' }}>{fmtR(u.walletBalance)}</td>
                    <td style={{ padding: '11px 10px' }}><span className={`badge ${u.subscription?.plan === 'premium' ? 'badge-gold' : 'badge-blue'}`}>{u.subscription?.plan || 'free'}</span></td>
                    <td style={{ padding: '11px 10px' }}><span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-blue'}`}>{u.role}</span></td>
                    <td style={{ padding: '11px 10px' }}><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Blocked'}</span></td>
                    <td style={{ padding: '11px 10px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '11px 10px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {/* Wallet adjust */}
                        <button onClick={() => setWalletModal(u)} title="Adjust wallet" style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', borderRadius: 5, background: 'rgba(67,97,238,0.12)', border: '1px solid rgba(67,97,238,0.25)', color: 'var(--blue)' }}>💰</button>
                        {/* Block/Unblock */}
                        {u._id !== adminId && (
                          <button onClick={() => toggleBlock(u)} title={u.isActive ? 'Block' : 'Unblock'} style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', borderRadius: 5, background: u.isActive ? 'rgba(239,35,60,0.1)' : 'rgba(6,214,160,0.1)', border: `1px solid ${u.isActive ? 'rgba(239,35,60,0.25)' : 'rgba(6,214,160,0.25)'}`, color: u.isActive ? 'var(--red)' : 'var(--green)' }}>
                            {u.isActive ? '🚫' : '✅'}
                          </button>
                        )}
                        {/* Role toggle */}
                        {u._id !== adminId && (
                          <button onClick={() => changeRole(u)} title={u.role === 'admin' ? 'Remove admin' : 'Make admin'} style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', borderRadius: 5, background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.25)', color: 'var(--gold)' }}>
                            {u.role === 'admin' ? '👤' : '🛡️'}
                          </button>
                        )}
                        {/* Delete */}
                        {u._id !== adminId && (
                          <button onClick={() => deleteUser(u)} title="Delete user" style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', borderRadius: 5, background: 'rgba(239,35,60,0.08)', border: '1px solid rgba(239,35,60,0.2)', color: 'var(--red)' }}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Prev</button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', alignSelf: 'center' }}>Page {page} of {pagination.pages}</span>
              <button className="btn btn-ghost" onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page === pagination.pages}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Wallet Modal */}
      {walletModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div className="card-elevated" style={{ width: '100%', maxWidth: 400 }}>
            <h3 className="font-display" style={{ fontWeight: 700, marginBottom: '1rem' }}>💰 Adjust Wallet — {walletModal.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1rem' }}>
              Current balance: <strong style={{ color: 'var(--gold)' }}>{fmtR(walletModal.walletBalance)}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                  Amount (use negative to deduct, e.g. -50000)
                </label>
                <input className="input" type="number" placeholder="e.g. 100000 or -50000" value={walletAmt} onChange={e => setWalletAmt(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Reason (shown to user)</label>
                <input className="input" placeholder="e.g. Competition reward" value={walletReason} onChange={e => setWalletReason(e.target.value)} />
              </div>
              {walletAmt && (
                <div className="alert alert-info" style={{ fontSize: '0.84rem' }}>
                  New balance will be: <strong>{fmtR(Math.max(0, (walletModal.walletBalance || 0) + parseFloat(walletAmt || 0)))}</strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={adjustWallet} style={{ flex: 1 }}>Apply</button>
                <button className="btn btn-ghost" onClick={() => { setWalletModal(null); setWalletAmt(''); setWalletReason('') }} style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TRANSACTIONS TAB
   ══════════════════════════════════════════════════════════════ */
function TransactionsTab() {
  const [rows, setRows]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [page,   setPage]   = useState(1)
  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    setLoading(true)
    API.get('/admin/transactions', { params: { type: filter !== 'ALL' ? filter : undefined, page, limit: 20 } })
      .then(r => { setRows(r.data.data); setPagination(r.data.pagination) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter, page])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 10, padding: 4 }}>
          {['ALL','BUY','SELL'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }} style={{
              padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.84rem',
              background: filter === f ? 'var(--blue)' : 'transparent',
              color:      filter === f ? '#fff'        : 'var(--text-secondary)',
            }}>{f}</button>
          ))}
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{pagination?.total ?? 0} total</span>
      </div>

      <div className="card">
        {loading ? <Spinner /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date','User','Stock','Type','Qty','Price','Total','P&L'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t._id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {new Date(t.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{t.userId?.name || '—'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{t.userId?.email}</div>
                    </td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>{t.symbol?.replace('.BSE','').replace('.NS','')}</td>
                    <td style={{ padding: '10px' }}><span className={`badge ${t.transactionType==='BUY'?'badge-green':'badge-red'}`}>{t.transactionType}</span></td>
                    <td className="font-mono" style={{ padding: '10px' }}>{t.quantity}</td>
                    <td className="font-mono" style={{ padding: '10px' }}>{fmtR(t.price)}</td>
                    <td className="font-mono" style={{ padding: '10px', fontWeight: 600 }}>{fmtR(t.totalAmount)}</td>
                    <td className="font-mono" style={{ padding: '10px', color: (t.profitLoss||0)>=0 ? 'var(--green)' : 'var(--red)' }}>
                      {t.transactionType==='SELL' ? `${(t.profitLoss||0)>=0?'+':''}${fmtR(t.profitLoss)}` : '—'}
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions</td></tr>}
              </tbody>
            </table>
            {pagination && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1rem' }}>
                <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Prev</button>
                <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Page {page}/{pagination.pages}</span>
                <button className="btn btn-ghost" onClick={() => setPage(p => Math.min(pagination.pages,p+1))} disabled={page===pagination.pages}>Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   COMPETITION TAB
   ══════════════════════════════════════════════════════════════ */
function CompetitionTab({ competitions, reload }) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [msg,  setMsg]  = useState(null)
  const flash = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500) }

  const create = async (e) => {
    e.preventDefault()
    try {
      await API.post('/admin/competition', form)
      flash('Competition created!'); setForm({ name:'', startDate:'', endDate:'' }); reload()
    } catch (err) { flash(err.response?.data?.error || 'Failed', 'error') }
  }

  const setStatus = async (id, status) => {
    try { await API.put(`/admin/competition/${id}`, { status }); flash(`Status set to ${status}`); reload() }
    catch (err) { flash(err.response?.data?.error || 'Failed', 'error') }
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {msg && <div className={`alert alert-${msg.type==='success'?'success':'error'}`}>{msg.text}</div>}

      {/* Create */}
      <div className="card">
        <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>➕ Create Competition</h3>
        <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Name</label>
            <input className="input" placeholder="e.g. Summer 2026 Championship" value={form.name} onChange={e => setForm({...form, name:e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Start Date</label>
            <input className="input" type="date" value={form.startDate} onChange={e => setForm({...form, startDate:e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>End Date</label>
            <input className="input" type="date" value={form.endDate} onChange={e => setForm({...form, endDate:e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '1rem' }}>All Competitions</h3>
        {competitions.map(c => (
          <div key={c._id} style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                {new Date(c.startDate).toLocaleDateString('en-IN')} – {new Date(c.endDate).toLocaleDateString('en-IN')} · {c.participants?.length ?? 0} participants
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${c.status==='active'?'badge-green':c.status==='completed'?'badge-blue':'badge-gold'}`}>{c.status}</span>
              {c.status === 'active'    && <button onClick={() => setStatus(c._id,'completed')} className="btn btn-ghost" style={{ fontSize:'0.75rem', padding:'3px 10px' }}>Mark Complete</button>}
              {c.status === 'completed' && <button onClick={() => setStatus(c._id,'active')}    className="btn btn-ghost" style={{ fontSize:'0.75rem', padding:'3px 10px' }}>Reopen</button>}
            </div>
          </div>
        ))}
        {!competitions.length && <p style={{ color: 'var(--text-secondary)' }}>No competitions yet</p>}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   BROADCAST TAB
   ══════════════════════════════════════════════════════════════ */
function BroadcastTab() {
  const [msg,     setMsg]     = useState('')
  const [type,    setType]    = useState('system')
  const [status,  setStatus]  = useState(null)
  const [loading, setLoading] = useState(false)

  const send = async (e) => {
    e.preventDefault()
    if (!msg.trim()) return
    setLoading(true)
    try {
      const r = await API.post('/admin/broadcast', { message: msg, type })
      setStatus({ text: r.data.message, ok: true })
      setMsg('')
    } catch (err) {
      setStatus({ text: err.response?.data?.error || 'Failed', ok: false })
    } finally {
      setLoading(false)
      setTimeout(() => setStatus(null), 4000)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h3 className="font-display" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>📢 Broadcast Notification</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.5rem' }}>
        Send a real-time notification to all active users instantly via Socket.IO.
      </p>

      {status && <div className={`alert alert-${status.ok?'success':'error'}`} style={{ marginBottom: '1rem' }}>{status.text}</div>}

      <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Type</label>
          <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="system">🔔 System</option>
            <option value="competition">🏆 Competition</option>
            <option value="alert">⚠️ Alert</option>
            <option value="trade">📊 Trade</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Message</label>
          <textarea className="input" rows={4} placeholder="e.g. 🎉 New competition starts Monday! Top prize for best returns this month." value={msg} onChange={e => setMsg(e.target.value)} required style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="submit" disabled={loading || !msg.trim()} className="btn btn-primary">
            {loading ? 'Sending…' : '📢 Send to All Users'}
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Delivered in real-time via Socket.IO</span>
        </div>
      </form>
    </div>
  )
}
