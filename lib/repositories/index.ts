// Centralized repository exports
export { BaseRepository } from './base-repository'
export type { 
  RepositoryResult, 
  PaginatedResult, 
  CreateResult, 
  UpdateResult, 
  DeleteResult 
} from './base-repository'

// User Repository
export { UserRepository, userRepository } from './user-repository'
export type { CreateUserInput, UpdateUserInput } from './user-repository'

// API Token Repository
export { ApiTokenRepository, apiTokenRepository } from './api-token-repository'
export type { CreateApiTokenInput, UpdateApiTokenInput } from './api-token-repository'

// Deck Repository
export { DeckRepository, deckRepository } from './deck-repository'

// Card Repository  
export { CardRepository, cardRepository } from './card-repository'

// Review Repository
export { ReviewRepository, reviewRepository } from './review-repository'
export type { 
  CreateReviewInput, 
  ReviewFilters, 
  ReviewStats 
} from './review-repository'

// Study Session Repository
export { StudySessionRepository, studySessionRepository } from './study-session-repository'
export type { 
  CreateStudySessionInput, 
  UpdateStudySessionInput, 
  StudySessionStats 
} from './study-session-repository'

// Deck Score Repository
export { DeckScoreRepository, deckScoreRepository } from './deck-score-repository'
export type { 
  DeckScoreStats, 
  UpsertDeckScoreInput 
} from './deck-score-repository'

// Ranking Repository
export { RankingRepository, rankingRepository } from './ranking-repository'
export type {
  RankingStats,
  RankingData
} from './ranking-repository'

// Individual repository exports are available above
// Import specific repositories as needed in your code