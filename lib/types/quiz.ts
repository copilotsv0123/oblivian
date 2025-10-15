import type { Choice } from '@/lib/types/cards'

export type QuizQuestionType = 'multiple_choice' | 'fill_blank' | 'true_false'

export interface BaseQuizItem {
  id: string
  cardId: string
  prompt: string
  type: QuizQuestionType
  deckId: string
  advancedNotes?: string
  mnemonics?: string
  solutionText?: string
  explanation?: string
}

export interface MultipleChoiceQuizItem extends BaseQuizItem {
  type: 'multiple_choice'
  choices: Array<Choice & { id: string }>
  correctChoiceId: string
}

export interface FillBlankQuizItem extends BaseQuizItem {
  type: 'fill_blank'
  answer: string
  acceptableAnswers: string[]
}

export interface TrueFalseQuizItem extends BaseQuizItem {
  type: 'true_false'
  statement: string
  isTrue: boolean
  correctStatement: string
}

export type QuizItem = MultipleChoiceQuizItem | FillBlankQuizItem | TrueFalseQuizItem
