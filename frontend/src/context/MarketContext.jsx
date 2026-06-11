import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { getSocket } from '../services/socket'
import { stockAPI, notificationAPI } from '../services/api'

const MarketContext = createContext(null)

export function MarketProvider({ children }) {
  const [stocks,        setStocks]        = useState([])
  const [nifty,         setNifty]         = useState(null)
  const [toasts,        setToasts]        = useState([])   // ephemeral toast popups
  const [notifications, setNotifications] = useState([])   // persistent bell list
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [connected,     setConnected]     = useState(false)
  const [dataSource,    setDataSource]    = useState('unknown')
  const socketBound  = useRef(false)
  const fetchedOnce  = useRef(false)
  const notifFetched = useRef(false)

  // ── Initial market data fetch (auth-gated) ────────────────
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || fetchedOnce.current) return
    fetchedOnce.current = true

    stockAPI.getOverview()
      .then(r => {
        setStocks(r.data.data.allStocks || [])
        setNifty(r.data.data.nifty)
        setDataSource(r.data.data.source || 'unknown')
      })
      .catch(() => { fetchedOnce.current = false })
  })

  // ── Load persisted notifications from DB ─────────────────
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || notifFetched.current) return
    notifFetched.current = true

    notificationAPI.get()
      .then(r => {
        const notifs = r.data.data || []
        setNotifications(notifs)
        setUnreadCount(notifs.filter(n => !n.read).length)
      })
      .catch(() => { notifFetched.current = false })
  })

  // ── Bind Socket.IO events ─────────────────────────────────
  useEffect(() => {
    if (socketBound.current) return

    const tryBind = () => {
      const sock = getSocket()
      if (!sock || socketBound.current) return
      socketBound.current = true

      sock.on('connect',    () => setConnected(true))
      sock.on('disconnect', () => setConnected(false))

      sock.on('market-update', (data) => {
        if (!Array.isArray(data) || !data.length) return
        setStocks(data)
        if (data[0]?.source) setDataSource(data[0].source)
      })

      sock.on('nifty-update', (data) => {
        if (data?.price) setNifty(data)
      })

      // Real-time notification (from admin broadcast or price alerts)
      sock.on('notification', (n) => {
        const id       = Date.now()
        const newNotif = {
          _id:       id,
          message:   n.message,
          type:      n.type || 'system',
          read:      false,
          createdAt: new Date().toISOString(),
          isNew:     true,    // flag for highlight animation
        }

        // Add to persistent list
        setNotifications(prev => [newNotif, ...prev].slice(0, 50))
        setUnreadCount(prev => prev + 1)

        // Also show as toast popup (auto-dismiss after 5s)
        setToasts(prev => [{ ...newNotif, toastId: id }, ...prev].slice(0, 5))
        setTimeout(() => setToasts(prev => prev.filter(t => t.toastId !== id)), 5000)
      })

      setConnected(sock.connected)
    }

    const interval = setInterval(() => {
      if (getSocket()) { tryBind(); clearInterval(interval) }
    }, 500)

    return () => clearInterval(interval)
  }, [])

  const getPrice     = (sym) => stocks.find(s => s.symbol === sym || s.avSymbol === sym)?.price ?? null
  const dismissToast = (id)  => setToasts(prev => prev.filter(t => t.toastId !== id))

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  const markOneRead = (notifId) => {
    setNotifications(prev => prev.map(n =>
      n._id === notifId ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <MarketContext.Provider value={{
      stocks, nifty, toasts, connected, dataSource,
      notifications, unreadCount,
      getPrice, dismissToast, markAllRead, markOneRead,
    }}>
      {children}
    </MarketContext.Provider>
  )
}

export const useMarket = () => useContext(MarketContext)
