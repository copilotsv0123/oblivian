import { DECK_GRADE_THRESHOLDS, DECK_GRADE_LABELS, DECK_GRADE_COLORS } from '@/lib/constants'

export type GradeKey = keyof typeof DECK_GRADE_THRESHOLDS
export type GradeLabel = typeof DECK_GRADE_LABELS[GradeKey]
export type GradeColor = typeof DECK_GRADE_COLORS[GradeKey]

export interface Grade {
  key: GradeKey
  label: GradeLabel
  color: GradeColor
}

/**
 * Calculate grade from accuracy percentage
 */
export function calculateGrade(accuracyPct: number): Grade {
  let gradeKey: GradeKey = 'F'

  if (accuracyPct >= DECK_GRADE_THRESHOLDS.A_PLUS) {
    gradeKey = 'A_PLUS'
  } else if (accuracyPct >= DECK_GRADE_THRESHOLDS.A) {
    gradeKey = 'A'
  } else if (accuracyPct >= DECK_GRADE_THRESHOLDS.B) {
    gradeKey = 'B'
  } else if (accuracyPct >= DECK_GRADE_THRESHOLDS.C) {
    gradeKey = 'C'
  } else if (accuracyPct >= DECK_GRADE_THRESHOLDS.D) {
    gradeKey = 'D'
  }

  return {
    key: gradeKey,
    label: DECK_GRADE_LABELS[gradeKey],
    color: DECK_GRADE_COLORS[gradeKey]
  }
}

/**
 * Get the best grade from multiple deck scores (different time windows)
 */
export function getBestGrade(scores: Array<{ accuracyPct: number }>): Grade | null {
  if (!scores || scores.length === 0) {
    return null
  }

  const bestAccuracy = Math.max(...scores.map(score => score.accuracyPct))
  return calculateGrade(bestAccuracy)
}