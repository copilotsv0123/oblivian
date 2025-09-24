'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { Trophy, Lock, Star, TrendingUp } from 'lucide-react'
import { achievementsRepo, type Achievement, type UserStats } from '@/lib/client/repositories'

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const data = await achievementsRepo.getAll()
        setAchievements(data.achievements)
        setTotalPoints(data.totalPoints || 0)
        setStats(data.stats || null)
      } catch (error) {
        console.error('Error fetching achievements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [])

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const completionRate = achievements.length > 0
    ? Math.round((unlockedCount / achievements.length) * 100)
    : 0

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-4">Achievements</h1>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                  <p className="text-2xl font-bold text-primary">{totalPoints}</p>
                </div>
                <Trophy className="w-8 h-8 text-primary/50" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-500/10 to-green-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unlocked</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {unlockedCount}/{achievements.length}
                  </p>
                </div>
                <Star className="w-8 h-8 text-emerald-500/50" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <p className="text-2xl font-bold text-primary">{completionRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary/50" />
              </div>
            </div>

            {stats && (
              <div className="card bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {stats.currentStreak} days
                    </p>
                  </div>
                  <span className="text-3xl">🔥</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={`card relative ${
                achievement.unlocked
                  ? 'bg-card border-emerald-200 dark:border-emerald-800'
                  : 'bg-muted/50 border-border'
              }`}
            >
              {/* Unlocked Badge */}
              {achievement.unlocked && (
                <div className="absolute top-2 right-2">
                  <div className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                    ✓ Unlocked
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`text-4xl ${
                    achievement.unlocked ? 'opacity-100' : 'opacity-50 grayscale'
                  }`}
                >
                  {achievement.icon}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-1 ${
                      achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {achievement.name}
                  </h3>
                  <p
                    className={`text-sm mb-2 ${
                      achievement.unlocked ? 'text-muted-foreground' : 'text-muted-foreground/60'
                    }`}
                  >
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  {!achievement.unlocked && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>
                          {achievement.current}/{achievement.target}
                        </span>
                        <span>{Math.round(achievement.progress)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${achievement.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Points */}
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={`text-sm font-medium ${
                        achievement.unlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'
                      }`}
                    >
                      {achievement.points} points
                    </span>
                    {achievement.unlocked && achievement.unlockedAt && (
                      <span className="text-xs text-muted-foreground/60">
                        · {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {achievements.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No achievements yet.
          </div>
        )}
      </div>
    </AppLayout>
  )
}