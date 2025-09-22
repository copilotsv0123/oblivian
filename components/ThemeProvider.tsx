'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isMounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'theme'

const resolveTheme = (theme: Theme, prefersDark: boolean): ResolvedTheme => {
  if (theme === 'system') {
    return prefersDark ? 'dark' : 'light'
  }
  return theme
}

const applyThemeClass = (resolved: ResolvedTheme) => {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored)
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to read stored theme preference', error)
      }
    }
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateTheme = (value: Theme) => {
      const resolved = resolveTheme(value, mediaQuery.matches)
      setResolvedTheme(resolved)
      applyThemeClass(resolved)
    }

    updateTheme(theme)

    const handleChange = (event: MediaQueryListEvent) => {
      if (theme === 'system') {
        const resolved = resolveTheme('system', event.matches)
        setResolvedTheme(resolved)
        applyThemeClass(resolved)
      }
    }

    if (theme === 'system') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, isMounted])

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Unable to persist theme preference', error)
      }
    }
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const resolved = resolveTheme(value, mediaQuery.matches)
      setResolvedTheme(resolved)
      applyThemeClass(resolved)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const currentResolved = resolveTheme(prev, mediaQuery.matches)
      const nextResolved: ResolvedTheme = currentResolved === 'dark' ? 'light' : 'dark'
      const nextTheme: Theme = prev === 'system' ? nextResolved : nextResolved
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme)
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Unable to persist theme preference', error)
        }
      }
      setResolvedTheme(nextResolved)
      applyThemeClass(nextResolved)
      return nextTheme
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, isMounted }),
    [theme, resolvedTheme, setTheme, toggleTheme, isMounted],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
