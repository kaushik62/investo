import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authAPI } from '../services/api'
import { initSocket, disconnectSocket } from '../services/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const loadedRef = useRef(false)

  // Load user from stored token — runs ONCE on mount
  const loadUser = useCallback(async () => {
    if (loadedRef.current) return
    loadedRef.current = true

    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await authAPI.getProfile()
      const u   = res.data.user
      setUser(u)
      initSocket(u._id)
    } catch {
      // Token invalid or expired — clear it silently
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  // ── Standard login ────────────────────────────────────────
  const login = async (credentials) => {
    const res         = await authAPI.login(credentials)
    const { token, user: u } = res.data
    localStorage.setItem('token', token)
    setUser(u)
    initSocket(u._id)
    return u
  }

  // ── Register ──────────────────────────────────────────────
  const register = async (data) => {
    const res         = await authAPI.register(data)
    const { token, user: u } = res.data
    localStorage.setItem('token', token)
    setUser(u)
    initSocket(u._id)
    return u
  }

  // ── Admin login (sets token + user directly) ──────────────
  const loginWithToken = (token, u) => {
    localStorage.setItem('token', token)
    setUser(u)
    initSocket(u._id)
  }

  // ── Logout ────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    loadedRef.current = false   // allow re-load if user logs in again
    disconnectSocket()
  }

  // ── Refresh profile (e.g. after wallet change) ────────────
  const refreshUser = async () => {
    const res = await authAPI.getProfile()
    setUser(res.data.user)
    return res.data.user
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithToken, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
