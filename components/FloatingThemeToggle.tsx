'use client'

import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

const APP_LAYOUT_PREFIXES = ['/dashboard', '/achievements', '/study', '/settings', '/decks', '/rankings']

export default function FloatingThemeToggle() {
  const pathname = usePathname()
  const hideToggle = pathname ? APP_LAYOUT_PREFIXES.some(prefix => pathname.startsWith(prefix)) : false

  if (hideToggle) {
    return null
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex print:hidden sm:right-6 sm:top-6">
      <ThemeToggle className="pointer-events-auto" />
    </div>
  )
}
