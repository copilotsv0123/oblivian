'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

interface AuthButtonProps {
  className?: string
  loginLabel?: string
  logoutLabel?: string
}

export function AuthButton({ className, loginLabel, logoutLabel }: AuthButtonProps) {
  const { user, loading, error, login, logout } = useAuth()
  const pathname = usePathname()
  const [localError, setLocalError] = useState<string | null>(null)

  const label = useMemo(() => {
    if (user) {
      return logoutLabel || 'Log out'
    }
    return loginLabel || 'Continue with Google'
  }, [user, loginLabel, logoutLabel])

  const handleClick = async () => {
    setLocalError(null)
    try {
      if (user) {
        await logout()
      } else {
        const returnUrl = pathname === '/login' || pathname === '/register' ? '/dashboard' : pathname || '/dashboard'
        await login(returnUrl)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication error'
      setLocalError(message)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={[
          'w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70',
          className || '',
        ].join(' ').trim()}
      >
        <span className="text-lg">{user ? '🚪' : '🔐'}</span>
        <span>{label}</span>
      </button>
      {(error || localError) && (
        <p className="text-sm text-red-600">{error || localError}</p>
      )}
    </div>
  )
}
