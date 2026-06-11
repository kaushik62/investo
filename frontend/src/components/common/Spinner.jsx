export default function Spinner({ size = 36, text = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
      <div className="spinner" style={{ width: size, height: size }} />
      {text && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{text}</p>}
    </div>
  )
}

export function FullPageSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'var(--bg-primary)' }}>
      <span style={{ fontSize: '2.5rem' }}>📉</span>
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <p style={{ color: 'var(--text-secondary)' }}>Loading Investo…</p>
    </div>
  )
}
