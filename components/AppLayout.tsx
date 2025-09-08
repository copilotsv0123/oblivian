'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          router.push('/login')
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) {
          setUser(data.user)
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen bg-accent">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-2xl font-bold text-primary">
                🧠 Oblivian
              </Link>
              <div className="flex gap-6">
                <Link 
                  href="/dashboard" 
                  className={`hover:text-primary transition-colors ${
                    isActive('/dashboard') ? 'text-primary font-semibold' : 'text-gray-600'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/rankings" 
                  className={`hover:text-primary transition-colors ${
                    isActive('/rankings') ? 'text-primary font-semibold' : 'text-gray-600'
                  }`}
                >
                  Rankings
                </Link>
                <Link 
                  href="/settings" 
                  className={`hover:text-primary transition-colors ${
                    isActive('/settings') ? 'text-primary font-semibold' : 'text-gray-600'
                  }`}
                >
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-gray-600">
                  {user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-primary transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}