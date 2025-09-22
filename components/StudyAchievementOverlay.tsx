'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils/time'
import { Brain, Trophy, Target, Star, Zap, BookOpen, Award, Sparkles } from 'lucide-react'

export type StudyAchievementType = 'session_complete' | 'perfect_score' | 'streak' | 'milestone'

interface StudyAchievementOverlayProps {
  isVisible: boolean
  type: StudyAchievementType
  title: string
  subtitle?: string
  onComplete: () => void
  sessionData?: {
    grade: string
    successRate: number
    cardsReviewed: number
    timeSpent: number
  }
}

const typeConfig = {
  session_complete: {
    icon: Brain,
    title: 'SESSION COMPLETE!',
    subtitle: 'Knowledge Absorbed',
    colors: 'from-blue-600 via-indigo-600 to-purple-800',
    glowColors: 'from-blue-400 via-indigo-400 to-purple-600',
    particleColor: 'text-blue-300'
  },
  perfect_score: {
    icon: Trophy,
    title: 'PERFECT SCORE!',
    subtitle: 'Legendary Performance',
    colors: 'from-yellow-500 via-orange-500 to-red-600',
    glowColors: 'from-yellow-400 via-orange-400 to-red-500',
    particleColor: 'text-yellow-300'
  },
  streak: {
    icon: Target,
    title: 'STREAK ACTIVE!',
    subtitle: 'Consistency Champion',
    colors: 'from-green-600 via-emerald-600 to-teal-800',
    glowColors: 'from-green-400 via-emerald-400 to-teal-600',
    particleColor: 'text-emerald-300'
  },
  milestone: {
    icon: Award,
    title: 'MILESTONE REACHED!',
    subtitle: 'Epic Achievement',
    colors: 'from-purple-600 via-pink-600 to-rose-800',
    glowColors: 'from-purple-400 via-pink-400 to-rose-600',
    particleColor: 'text-purple-300'
  }
}

// Particle component for floating effects
function Particle({ delay, duration, startX, startY, endX, endY, className }: {
  delay: number
  duration: number
  startX: string
  startY: string
  endX: string
  endY: string
  className: string
}) {
  return (
    <div
      className={cn("absolute opacity-0", className)}
      style={{
        left: startX,
        top: startY,
        animation: `particle-float ${duration}s ease-out ${delay}s forwards`
      }}
    >
      <Sparkles className="h-4 w-4" />
    </div>
  )
}

const getGradeIcon = (grade: string) => {
  if (grade.startsWith('A')) return Trophy
  if (grade.startsWith('B')) return Award
  if (grade.startsWith('C')) return Target
  return BookOpen
}

const getGradeMessage = (grade: string, successRate: number) => {
  if (grade === 'A+') return "Flawless Victory!"
  if (grade.startsWith('A')) return "Excellent Mastery!"
  if (grade.startsWith('B')) return "Great Progress!"
  if (grade.startsWith('C')) return "Steady Learning!"
  return "Keep Practicing!"
}


export function StudyAchievementOverlay({
  isVisible,
  type,
  title,
  subtitle,
  onComplete,
  sessionData
}: StudyAchievementOverlayProps) {
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'showing' | 'exiting'>('entering')

  // Determine achievement type based on session data
  const achievementType = sessionData?.grade === 'A+' ? 'perfect_score' : 'session_complete'
  const config = typeConfig[achievementType]
  const IconComponent = sessionData ? getGradeIcon(sessionData.grade) : config.icon

  const displayTitle = sessionData ? getGradeMessage(sessionData.grade, sessionData.successRate) : config.title
  const displaySubtitle = sessionData ? `Grade ${sessionData.grade} • ${sessionData.successRate}% Success` : config.subtitle

  useEffect(() => {
    if (!isVisible) return

    setAnimationPhase('entering')

    const timer1 = setTimeout(() => {
      setAnimationPhase('showing')
    }, 200)

    const timer2 = setTimeout(() => {
      setAnimationPhase('exiting')
    }, 4000) // Show a bit longer than Kradar for study celebration

    const timer3 = setTimeout(() => {
      onComplete()
    }, 4500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <>
      {/* Keyframe animations */}
      <style jsx global>{`
        .achievement-overlay {
          background: radial-gradient(
            circle at center,
            hsl(var(--scrim, 222 47% 12%) / 0.82) 0%,
            hsl(var(--scrim, 222 47% 12%) / 0.94) 100%
          );
        }

        @keyframes particle-float {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-200px) scale(1.2) rotate(360deg);
          }
        }

        @keyframes achievement-glow {
          0%, 100% {
            box-shadow: 0 0 20px hsl(var(--overlay-foreground, 210 40% 98%) / 0.3);
          }
          50% {
            box-shadow:
              0 0 40px hsl(var(--overlay-foreground, 210 40% 98%) / 0.6),
              0 0 80px hsl(var(--overlay-foreground, 210 40% 98%) / 0.3);
          }
        }

        @keyframes title-reveal {
          0% {
            transform: translateY(30px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes stats-reveal {
          0% {
            transform: translateY(20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

      `}</style>

      {/* Full-screen overlay */}
      <div
        className="achievement-overlay fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer"
        onClick={onComplete}
        title="Click to dismiss"
      >
        {/* Animated particles */}
        {Array.from({ length: 30 }).map((_, i) => (
          <Particle
            key={i}
            delay={i * 0.05}
            duration={2 + Math.random() * 3}
            startX={`${20 + Math.random() * 60}%`}
            startY={`${30 + Math.random() * 40}%`}
            endX={`${10 + Math.random() * 80}%`}
            endY={`${10 + Math.random() * 30}%`}
            className={config.particleColor}
          />
        ))}

        {/* Main achievement container */}
        <div
          className="relative flex flex-col items-center text-center max-w-2xl px-8"
        >

          {/* Icon with glow effect */}
          <div
            className={cn(
              "relative mb-8 p-6 rounded-full bg-gradient-to-br shadow-2xl",
              config.colors,
              "animate-[achievement-glow_2s_ease-in-out_infinite]"
            )}
          >
            <IconComponent className="h-16 w-16 text-white drop-shadow-lg" />

            {/* Sparkle effects around icon */}
            <Star className="absolute -top-2 -right-2 h-6 w-6 text-yellow-300 animate-pulse" />
            <Zap className="absolute -bottom-1 -left-2 h-5 w-5 text-yellow-400 animate-bounce" />
            <Sparkles className="absolute -top-1 -left-3 h-4 w-4 text-white animate-ping" />
          </div>

          {/* Title and subtitle */}
          <div className="space-y-3 animate-[title-reveal_0.6s_ease-out_0.3s_both]">
            <h1
              className={cn(
                "text-5xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r",
                config.glowColors,
                "drop-shadow-2xl"
              )}
            >
              {displayTitle}
            </h1>

            <p className="text-xl md:text-2xl font-bold text-gray-200 tracking-wide drop-shadow-lg">
              {displaySubtitle}
            </p>

            <div className="mt-4 px-8 py-2 bg-black/30 rounded-full border border-white/20 flex justify-center">
              <p className="text-lg font-medium text-white/90 text-center max-w-md">
                {title}
              </p>
            </div>
          </div>

          {/* Session stats */}
          {sessionData && (
            <div className="mt-6 animate-[stats-reveal_0.8s_ease-out_0.6s_both]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-black/20 rounded-2xl p-6 border border-white/10">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{sessionData.cardsReviewed}</p>
                  <p className="text-sm text-gray-300">Cards</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {formatTime(sessionData.timeSpent)}
                  </p>
                  <p className="text-sm text-gray-300">Time</p>
                </div>
                <div className="text-center col-span-2 md:col-span-1">
                  <p className={cn(
                    "text-2xl font-bold",
                    sessionData.grade.startsWith('A') ? 'text-yellow-300' :
                    sessionData.grade.startsWith('B') ? 'text-blue-300' :
                    sessionData.grade.startsWith('C') ? 'text-green-300' : 'text-gray-300'
                  )}>
                    {sessionData.grade}
                  </p>
                  <p className="text-sm text-gray-300">Grade</p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom decorative elements */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-white/50" />
              <Brain className="h-4 w-4 text-white/70" />
              <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-white/50" />
            </div>
            <div className="text-xs text-white/50">
              Click anywhere to continue
            </div>
          </div>
        </div>
      </div>
    </>
  )
}