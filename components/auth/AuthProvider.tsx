'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

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

async function fetchSession() {
  const res = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('Failed to fetch session')
  }

  return res.json() as Promise<{
    authenticated: boolean
    user: AuthenticatedUser | null
    expiresAt?: string
  }>
}

async function initiateGoogleLogin(returnUrl?: string) {
  const res = await fetch('/api/auth/google/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ returnUrl }),
  })

  const data = await res.json()

  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Failed to start Google authentication')
  }

  window.location.href = data.url
}

async function terminateSession() {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Failed to logout')
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)

  const loadSession = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchSession()
      if (data.authenticated && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
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
      await initiateGoogleLogin(returnUrl)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to initiate login')
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    try {
      await terminateSession()
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
