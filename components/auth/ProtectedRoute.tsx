'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      const params = new URLSearchParams()
      if (pathname && pathname !== '/login') {
        params.set('returnUrl', pathname)
      }
      router.replace(`/login${params.toString() ? `?${params}` : ''}`)
    }
  }, [loading, user, router, pathname])

  if (loading || !user) {
    return <>{fallback ?? null}</>
  }

  return <>{children}</>
}
