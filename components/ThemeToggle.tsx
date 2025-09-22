'use client'

import type { ComponentType } from 'react'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, Moon, Sun, MonitorSmartphone } from 'lucide-react'
import { useTheme } from './ThemeProvider'

type ThemeOption = {
  label: string
  value: 'light' | 'dark' | 'system'
  icon: ComponentType<{ className?: string }>
}

const OPTIONS: ThemeOption[] = [
  { label: 'Light', value: 'light', icon: Sun },
  { label: 'Dark', value: 'dark', icon: Moon },
  { label: 'System', value: 'system', icon: MonitorSmartphone },
]

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme, isMounted } = useTheme()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handleClick = (event: MouseEvent) => {
      if (!popoverRef.current) return
      if (popoverRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const ActiveIcon = resolvedTheme === 'dark' ? Moon : Sun
  const resolvedLabel = resolvedTheme === 'dark' ? 'Dark' : 'Light'

  return (
    <div className={clsx('relative', className)} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Toggle theme (currently ${resolvedLabel})`}
        disabled={!isMounted}
      >
        <ActiveIcon className="h-5 w-5" />
      </button>

      {open && isMounted && (
        <div
          className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-border/80 bg-card p-2 text-sm shadow-lg"
          role="menu"
          aria-label="Theme options"
        >
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Appearance
          </p>
          <div className="space-y-1">
            {OPTIONS.map(option => {
              const Icon = option.icon
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTheme(option.value)
                    setOpen(false)
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                  role="menuitemradio"
                  aria-checked={isActive}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{option.label}</span>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </button>
              )
            })}
          </div>
          <p className="pt-2 text-[11px] leading-tight text-muted-foreground/80">
            Current:&nbsp;
            <span className="font-medium text-foreground">{resolvedLabel}</span>
          </p>
        </div>
      )}
    </div>
  )
}
