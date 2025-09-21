'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp, Clock, Target, ArrowRight } from 'lucide-react'
import { StudyAchievementOverlay } from './StudyAchievementOverlay'
import { useStudyAchievements } from '@/hooks/useStudyAchievements'

interface SessionPerformance {
  sessionId: string
  startedAt: string
  endedAt: string | null
  secondsActive: number
  totalReviews: number
  cardsReviewed: number
  performanceGrade: string | null
  successRate: number | null
}

interface DeckStats {
  lastStudyDate: string | null
  totalSessions: number
  totalCardsReviewed: number
  performanceGrade: string | null
  successRate: number | null
  reviewCount: number
  isSessionSpecific: boolean
  sessionId: string | null
}

interface SessionCompletionScreenProps {
  deckId: string
  sessionId: string
  deckTitle: string
  onContinue: () => void
}

const getGradeColor = (grade: string): string => {
  if (grade.startsWith('A')) return 'text-green-600'
  if (grade.startsWith('B')) return 'text-blue-600'
  if (grade.startsWith('C')) return 'text-yellow-600'
  if (grade.startsWith('D')) return 'text-orange-600'
  if (grade === 'F') return 'text-red-600'
  return 'text-gray-600'
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function SessionCompletionScreen({
  deckId,
  sessionId,
  deckTitle,
  onContinue
}: SessionCompletionScreenProps) {
  const [sessionPerformance, setSessionPerformance] = useState<SessionPerformance | null>(null)
  const [deckStats, setDeckStats] = useState<DeckStats | null>(null)
  const [historicalStats, setHistoricalStats] = useState<DeckStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMainContent, setShowMainContent] = useState(false)

  const { achievement, triggerSessionComplete, hideAchievement } = useStudyAchievements()

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const [sessionRes, sessionStatsRes, historicalStatsRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}/performance`),
          fetch(`/api/decks/${deckId}/stats?sessionId=${sessionId}`),
          fetch(`/api/decks/${deckId}/stats`)
        ])

        let sessionData = null
        if (sessionRes.ok) {
          sessionData = await sessionRes.json()
          console.log('Session performance data:', sessionData.sessionPerformance)
          setSessionPerformance(sessionData.sessionPerformance)
        } else {
          console.error('Session performance fetch failed:', sessionRes.status, await sessionRes.text())
        }

        if (sessionStatsRes.ok) {
          const sessionStatsData = await sessionStatsRes.json()
          setDeckStats(sessionStatsData.stats)
        }

        if (historicalStatsRes.ok) {
          const historicalData = await historicalStatsRes.json()
          setHistoricalStats(historicalData.stats)
        }

        // Trigger achievement overlay if we have session performance data
        if (sessionData && sessionData.sessionPerformance) {
          const performance = sessionData.sessionPerformance

          if (performance.performanceGrade && performance.successRate !== null) {
            // Trigger the achievement overlay
            triggerSessionComplete(deckTitle, {
              grade: performance.performanceGrade,
              successRate: performance.successRate,
              cardsReviewed: performance.cardsReviewed,
              timeSpent: performance.secondsActive
            })
          }
        }
      } catch (error) {
        console.error('Error fetching performance data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPerformanceData()
  }, [deckId, sessionId, deckTitle, triggerSessionComplete])

  if (loading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <p className="text-gray-600">Loading session results...</p>
      </div>
    )
  }

  const handleAchievementComplete = () => {
    hideAchievement()
    setShowMainContent(true)
  }

  return (
    <>
      {/* Achievement Overlay */}
      <StudyAchievementOverlay
        isVisible={achievement.isVisible}
        type={achievement.type}
        title={achievement.title}
        subtitle={achievement.subtitle}
        onComplete={handleAchievementComplete}
        sessionData={achievement.sessionData}
      />

      {/* Main completion screen - only show after achievement */}
      {(showMainContent || !achievement.sessionData) && (
        <div className="min-h-screen bg-accent flex flex-col items-center justify-center p-4">
          <div className="card max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2">Session Complete!</h2>
          <p className="text-gray-600">Great work studying &ldquo;{deckTitle}&rdquo;</p>
        </div>

        {/* Session Performance */}
        {sessionPerformance ? (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              This Session
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{sessionPerformance.cardsReviewed}</p>
                <p className="text-sm text-gray-600">Cards Reviewed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{sessionPerformance.totalReviews}</p>
                <p className="text-sm text-gray-600">Total Reviews</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{formatTime(sessionPerformance.secondsActive)}</p>
                <p className="text-sm text-gray-600">Time Active</p>
              </div>
              {sessionPerformance.performanceGrade ? (
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getGradeColor(sessionPerformance.performanceGrade)}`}>
                    {sessionPerformance.performanceGrade}
                  </p>
                  <p className="text-sm text-gray-600">
                    Grade ({sessionPerformance.successRate}%)
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">No Grade</p>
                  <p className="text-sm text-gray-600">No reviews found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <h3 className="text-lg font-semibold text-red-800 mb-4">Session Performance</h3>
            <p className="text-red-600">Failed to load session performance data. Check console for errors.</p>
          </div>
        )}

        {/* Overall Deck Performance */}
        {historicalStats && (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Overall Deck Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{historicalStats.totalSessions}</p>
                <p className="text-sm text-gray-600">Total Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{historicalStats.totalCardsReviewed}</p>
                <p className="text-sm text-gray-600">Cards Mastered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{historicalStats.reviewCount}</p>
                <p className="text-sm text-gray-600">Recent Reviews</p>
              </div>
              {historicalStats.performanceGrade && (
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getGradeColor(historicalStats.performanceGrade)}`}>
                    {historicalStats.performanceGrade}
                  </p>
                  <p className="text-sm text-gray-600">
                    Historical Grade ({historicalStats.successRate}%)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Comparison */}
        {sessionPerformance && historicalStats && sessionPerformance.performanceGrade && historicalStats.performanceGrade && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Session Grade</p>
                <p className={`text-xl font-bold ${getGradeColor(sessionPerformance.performanceGrade)}`}>
                  {sessionPerformance.performanceGrade}
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400" />
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Overall Grade</p>
                <p className={`text-xl font-bold ${getGradeColor(historicalStats.performanceGrade)}`}>
                  {historicalStats.performanceGrade}
                </p>
              </div>
            </div>
            {sessionPerformance.successRate && historicalStats.successRate && (
              <p className="text-center text-sm text-gray-600 mt-2">
                {sessionPerformance.successRate > historicalStats.successRate ? (
                  <span className="text-green-600">🎉 Great session! You improved your overall performance.</span>
                ) : sessionPerformance.successRate === historicalStats.successRate ? (
                  <span className="text-blue-600">👍 Solid session! You maintained your performance level.</span>
                ) : (
                  <span className="text-orange-600">📚 Keep practicing! Your overall performance is still strong.</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={onContinue}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href={`/decks/${deckId}`}
            className="btn-secondary flex-1 text-center"
          >
            Back to Deck
          </Link>
          </div>
        </div>
      </div>
      )}
    </>
  )
}