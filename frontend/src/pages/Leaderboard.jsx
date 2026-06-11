import { useState, useEffect } from 'react'
import { leaderboardAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/common/Spinner'

function RankBadge({ rank }) {
  if (rank === 1) return <span style={{ fontSize: '1.3rem' }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: '1.3rem' }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: '1.3rem' }}>🥉</span>
  return <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>#{rank}</span>
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [rankings, setRankings] = useState([])
  const [competition, setCompetition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overall')

  useEffect(() => {
    Promise.all([leaderboardAPI.get(), leaderboardAPI.getCompetition()])
      .then(([r, c]) => { setRankings(r.data.data || []); setCompetition(c.data.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const myRank = rankings.find((r) => r.userId?.toString() === user?._id?.toString())
  const list = tab === 'overall' ? rankings : (competition?.participants || [])

  if (loading) return <Spinner text="Loading leaderboard…" />

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 700 }}>🏆 Leaderboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Ranked by portfolio return %</p>
      </div>

      {/* My rank */}
      {myRank && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(67,97,238,0.18), rgba(6,214,160,0.08))',
          border: '1px solid rgba(67,97,238,0.3)', borderRadius: 14,
          padding: '1rem 1.5rem', marginBottom: '1.5rem',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Your Rank</div>
            <div className="font-display" style={{ fontWeight: 700, fontSize: '1.2rem' }}>#{myRank.rank} of {rankings.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Portfolio Value</div>
            <div className="font-mono" style={{ fontWeight: 600 }}>₹{(myRank.portfolioValue ?? 0).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Return</div>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: '1.1rem', color: (myRank.returnPercentage ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {(myRank.returnPercentage ?? 0) >= 0 ? '+' : ''}{(myRank.returnPercentage ?? 0).toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {[{ k: 'overall', l: '📊 Overall' }, { k: 'competition', l: '🏆 Monthly' }].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: '7px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.875rem',
            background: tab === t.k ? 'var(--blue)' : 'var(--bg-card)',
            color: tab === t.k ? '#fff' : 'var(--text-secondary)',
          }}>{t.l}</button>
        ))}
      </div>

      {/* Competition banner */}
      {tab === 'competition' && competition && (
        <div className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{competition.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              {new Date(competition.startDate).toLocaleDateString('en-IN')} – {new Date(competition.endDate).toLocaleDateString('en-IN')}
            </div>
          </div>
          <span className={`badge ${competition.status === 'active' ? 'badge-green' : 'badge-blue'}`}>{competition.status?.toUpperCase()}</span>
        </div>
      )}

      {/* Rankings */}
      <div className="card">
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
            <p>No data yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((e, i) => {
              const isMe = e.userId?.toString() === user?._id?.toString()
              const ret = e.returnPercentage ?? 0
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px',
                  background: isMe ? 'rgba(67,97,238,0.1)' : 'var(--bg-elevated)',
                  borderRadius: 12, border: isMe ? '1px solid rgba(67,97,238,0.3)' : '1px solid transparent',
                }}>
                  <div style={{ width: 34, textAlign: 'center', flexShrink: 0 }}>
                    <RankBadge rank={e.rank || i + 1} />
                  </div>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, hsl(${(e.rank || i) * 47},65%,50%), hsl(${(e.rank || i) * 47 + 60},65%,38%))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: '#fff', fontSize: '0.875rem',
                  }}>{e.name?.[0]?.toUpperCase() || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {e.name}
                      {isMe && <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>YOU</span>}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{e.email}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="font-mono" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      ₹{(e.portfolioValue ?? 0).toLocaleString('en-IN',{maximumFractionDigits:0})}
                    </div>
                    <div className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: ret >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
