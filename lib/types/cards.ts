export type CardType = 'basic' | 'cloze' | 'multiple_choice' | 'explain'

export interface Choice {
  text: string
  isCorrect: boolean
}

export interface BaseCard {
  id: string
  deckId: string
  type: CardType
  front: string
  createdAt: Date
  updatedAt: Date
}

export interface BasicCard extends BaseCard {
  type: 'basic'
  back: string
  choices?: never
  explanation?: never
}

export interface ClozeCard extends BaseCard {
  type: 'cloze'
  back: string
  choices?: never
  explanation?: never
}

export interface MultipleChoiceCard extends BaseCard {
  type: 'multiple_choice'
  back?: never
  choices: Choice[]
  explanation?: string
}

export interface ExplainCard extends BaseCard {
  type: 'explain'
  back?: never
  choices?: never
  explanation: string
}

export type Card = BasicCard | ClozeCard | MultipleChoiceCard | ExplainCard

export interface CreateCardInput {
  deckId: string
  type: CardType
  front: string
  back?: string
  choices?: Choice[]
  explanation?: string
}

export interface UpdateCardInput {
  type?: CardType
  front?: string
  back?: string
  choices?: Choice[]
  explanation?: string
}