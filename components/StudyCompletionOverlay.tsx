'use client'

import { useState, useEffect } from 'react'
import { StudyAchievementOverlay } from './StudyAchievementOverlay'
import { useStudyAchievements } from '@/hooks/useStudyAchievements'

interface StudyCompletionOverlayProps {
  isVisible: boolean
  deckId: string
  sessionId: string
  deckTitle: string
  onComplete: () => void
}

export default function StudyCompletionOverlay({
  isVisible,
  deckId,
  sessionId,
  deckTitle,
  onComplete
}: StudyCompletionOverlayProps) {
  const [sessionPerformance, setSessionPerformance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const { achievement, triggerSessionComplete, hideAchievement } = useStudyAchievements()

  useEffect(() => {
    if (!isVisible) return

    const fetchSessionPerformance = async () => {
      try {
        const sessionRes = await fetch(`/api/sessions/${sessionId}/performance`)

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          const performance = sessionData.sessionPerformance
          setSessionPerformance(performance)

          if (performance && performance.cardsReviewed > 0) {
            triggerSessionComplete(deckTitle, {
              grade: performance.performanceGrade || 'F',
              successRate: performance.successRate || 0,
              cardsReviewed: performance.cardsReviewed,
              timeSpent: performance.secondsActive
            })
          }
        }
      } catch (error) {
        console.error('Error fetching session performance:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessionPerformance()
  }, [isVisible, sessionId, deckTitle, triggerSessionComplete])

  const handleAchievementComplete = () => {
    hideAchievement()
    onComplete() // This will navigate back to the deck page
  }

  if (!isVisible) return null

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
        <p className="text-white text-lg">Calculating performance...</p>
      </div>
    )
  }

  return (
    <StudyAchievementOverlay
      isVisible={achievement.isVisible}
      type={achievement.type}
      title={achievement.title}
      subtitle={achievement.subtitle}
      onComplete={handleAchievementComplete}
      sessionData={achievement.sessionData}
    />
  )
}