'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authRepo } from '@/lib/client/repositories'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

export interface AuthContextValue {
  user: AuthenticatedUser | null
  loading: boolean
  error: string | null
  expiresAt: Date | null
  login: (returnUrl?: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)

  const loadSession = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await authRepo.getSession()
      if (data.authenticated && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || '',
          avatarUrl: data.user.avatarUrl ?? null,
        })
        setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null)
      } else {
        setUser(null)
        setExpiresAt(null)
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load session')
      setUser(null)
      setExpiresAt(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const login = useCallback(async (returnUrl?: string) => {
    setError(null)
    try {
      const data = await authRepo.initiateGoogleLogin(returnUrl)
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to initiate login')
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await authRepo.logout()
      setUser(null)
      setExpiresAt(null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to logout')
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    expiresAt,
    login,
    logout,
    refresh: loadSession,
  }), [user, loading, error, expiresAt, login, logout, loadSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
