'use client'

import { useState, useCallback } from 'react'
import { StudyAchievementType } from '@/components/StudyAchievementOverlay'

interface StudyAchievement {
  type: StudyAchievementType
  title: string
  subtitle?: string
  isVisible: boolean
  sessionData?: {
    grade: string
    successRate: number
    cardsReviewed: number
    timeSpent: number
  }
}

export function useStudyAchievements() {
  const [achievement, setAchievement] = useState<StudyAchievement>({
    type: 'session_complete',
    title: '',
    isVisible: false
  })

  const triggerSessionComplete = useCallback((deckTitle: string, sessionData: {
    grade: string
    successRate: number
    cardsReviewed: number
    timeSpent: number
  }) => {
    // Determine achievement type based on performance
    let type: StudyAchievementType = 'session_complete'
    let title = `"${deckTitle}" Study Complete`

    if (sessionData.grade === 'A+' && sessionData.successRate === 100) {
      type = 'perfect_score'
      title = `Perfect Score on "${deckTitle}"!`
    } else if (sessionData.grade.startsWith('A')) {
      title = `Excellent work on "${deckTitle}"!`
    } else if (sessionData.grade.startsWith('B')) {
      title = `Good progress on "${deckTitle}"!`
    } else if (sessionData.grade.startsWith('C')) {
      title = `Keep practicing "${deckTitle}"!`
    } else {
      title = `Study session complete for "${deckTitle}"`
    }

    setAchievement({
      type,
      title,
      isVisible: true,
      sessionData
    })
  }, [])

  const triggerMilestone = useCallback((title: string, subtitle?: string) => {
    setAchievement({
      type: 'milestone',
      title,
      subtitle,
      isVisible: true
    })
  }, [])

  const triggerStreak = useCallback((title: string, subtitle?: string) => {
    setAchievement({
      type: 'streak',
      title,
      subtitle,
      isVisible: true
    })
  }, [])

  const hideAchievement = useCallback(() => {
    setAchievement(prev => ({
      ...prev,
      isVisible: false
    }))
  }, [])

  return {
    achievement,
    triggerSessionComplete,
    triggerMilestone,
    triggerStreak,
    hideAchievement
  }
}