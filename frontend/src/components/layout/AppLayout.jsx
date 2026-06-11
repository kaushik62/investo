import Navbar from '../common/Navbar'
import StockTicker from '../common/StockTicker'

export default function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <StockTicker />
      <main style={{ minHeight: 'calc(100vh - 90px)' }}>{children}</main>
    </>
  )
}
