// Application-wide constants

// Card limits
export const MAX_CARDS_PER_DECK = 500
export const MAX_CARDS_PER_BATCH_IMPORT = 100

// Study session settings
export const DEFAULT_STUDY_SESSION_SIZE = 10
export const MAX_NEW_CARDS_PER_SESSION = 5

// Performance thresholds for deck grading
export const DECK_GRADE_THRESHOLDS = {
  A_PLUS: 0.95,  // 95%+ success rate
  A: 0.90,       // 90-94%
  B: 0.80,       // 80-89%
  C: 0.70,       // 70-79%
  D: 0.60,       // 60-69%
  F: 0           // Below 60%
} as const

export const DECK_GRADE_LABELS = {
  A_PLUS: 'A+',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  F: 'F'
} as const

export const DECK_GRADE_COLORS = {
  A_PLUS: '#16a34a', // green-600
  A: '#22c55e',      // green-500
  B: '#3b82f6',      // blue-500
  C: '#eab308',      // yellow-500
  D: '#f97316',      // orange-500
  F: '#ef4444'       // red-500
} as const