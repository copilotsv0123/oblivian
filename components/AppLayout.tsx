'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Trophy, Sparkles, Settings, LogOut, Menu, X } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [achievementCount, setAchievementCount] = useState<{ earned: number; total: number } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check authentication
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          // Store the current path to redirect back after login
          const returnUrl = encodeURIComponent(pathname)
          router.push(`/login?returnUrl=${returnUrl}`)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) {
          setUser(data.user)
          // Fetch achievement counts
          fetch('/api/achievements')
            .then(res => res.json())
            .then(achievementData => {
              if (achievementData.achievements) {
                const earned = achievementData.achievements.filter((a: any) => a.unlockedAt).length
                const total = achievementData.achievements.length
                setAchievementCount({ earned, total })
              }
            })
            .catch(console.error)
        }
      })
      .finally(() => setLoading(false))
  }, [router, pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleRandomStudy = useCallback(async () => {
    try {
      // Fetch user's decks with card counts
      const res = await fetch('/api/decks')
      if (!res.ok) return

      const data = await res.json()
      const decksWithCards = data.decks.filter((deck: { cardCount?: number }) => (deck.cardCount || 0) > 0)

      if (decksWithCards.length === 0) {
        router.push('/dashboard')
        return
      }

      // Pick random deck and navigate
      const randomDeck = decksWithCards[Math.floor(Math.random() * decksWithCards.length)]
      router.push(`/study/${randomDeck.id}`)
    } catch (error) {
      console.error('Error starting random study:', error)
      router.push('/dashboard')
    }
  }, [router])

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
            {/* Logo and Desktop Menu */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-primary">
                <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#a78bfa', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <rect x="40" y="140" width="320" height="200" rx="16" fill="url(#headerGradient)" fillOpacity="0.3" stroke="url(#headerGradient)" strokeWidth="4"/>
                  <rect x="80" y="100" width="320" height="200" rx="16" fill="url(#headerGradient)" fillOpacity="0.5" stroke="url(#headerGradient)" strokeWidth="4"/>
                  <rect x="120" y="60" width="320" height="200" rx="16" fill="url(#headerGradient)" stroke="url(#headerGradient)" strokeWidth="4"/>
                  <circle cx="280" cy="160" r="60" fill="white" fillOpacity="0.9"/>
                  <text x="280" y="185" fontSize="72" fontWeight="bold" fill="url(#headerGradient)" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">O</text>
                </svg>
                <span className="hidden sm:inline">Oblivian</span>
              </Link>
              {/* Desktop Menu */}
              <div className="hidden md:flex gap-6">
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 hover:text-primary transition-colors ${
                    isActive('/dashboard') ? 'text-primary font-semibold' : 'text-gray-600'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  href="/achievements"
                  className={`flex items-center gap-2 hover:text-primary transition-colors ${
                    isActive('/achievements') ? 'text-primary font-semibold' : 'text-gray-600'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  Achievements {achievementCount && `(${achievementCount.earned}/${achievementCount.total})`}
                </Link>
                <button
                  onClick={handleRandomStudy}
                  className="flex items-center gap-2 hover:text-primary transition-colors text-gray-600"
                >
                  <Sparkles className="w-4 h-4" />
                  Random Deck
                </button>
                <Link
                  href="/settings"
                  className={`flex items-center gap-2 hover:text-primary transition-colors ${
                    isActive('/settings') ? 'text-primary font-semibold' : 'text-gray-600'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </div>
            </div>
            {/* Desktop User Info */}
            <div className="hidden md:flex items-center gap-4">
              {user && (
                <span className="text-gray-600">
                  {user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-3 space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                  isActive('/dashboard') ? 'text-primary font-semibold bg-indigo-50' : 'text-gray-600'
                }`}
              >
                <Home className="w-5 h-5" />
                Dashboard
              </Link>
              <Link
                href="/achievements"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                  isActive('/achievements') ? 'text-primary font-semibold bg-indigo-50' : 'text-gray-600'
                }`}
              >
                <Trophy className="w-5 h-5" />
                Achievements {achievementCount && `(${achievementCount.earned}/${achievementCount.total})`}
              </Link>
              <button
                onClick={() => {
                  handleRandomStudy()
                  setMobileMenuOpen(false)
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 w-full text-left"
              >
                <Sparkles className="w-5 h-5" />
                Random Deck
              </button>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
                  isActive('/settings') ? 'text-primary font-semibold bg-indigo-50' : 'text-gray-600'
                }`}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              <div className="border-t pt-3 mt-3">
                {user && (
                  <div className="px-3 py-2 text-sm text-gray-600">
                    {user.email}
                  </div>
                )}
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 w-full text-left"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      <main>{children}</main>
    </div>
  )
}