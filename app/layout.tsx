import type { Metadata } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import FloatingThemeToggle from '@/components/FloatingThemeToggle'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Oblivian - Never forget what matters',
  description: 'A modern spaced repetition system that helps you learn faster and remember longer.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const themeInitializer = `(() => {
  try {
    const stored = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : 'system';
    const resolved = theme === 'dark' || (theme === 'system' && prefersDark) ? 'dark' : 'light';
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (error) {
    // Ignore errors: we'll fall back to the default theme during hydration.
  }
})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background text-foreground transition-colors">
        <Script id="theme-initializer" strategy="beforeInteractive">
          {themeInitializer}
        </Script>
        <ThemeProvider>
          <FloatingThemeToggle />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}