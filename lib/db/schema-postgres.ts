import { pgTable, text, integer, real, boolean, timestamp, uuid, vector } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionTokenHash: text('session_token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  googleAccessTokenEnc: text('google_access_token_enc'),
  googleRefreshTokenEnc: text('google_refresh_token_enc'),
  googleIdTokenEnc: text('google_id_token_enc'),
  googleTokenExpiresAt: timestamp('google_token_expires_at', { withTimezone: true }),
})

export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
})

export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  level: text('level').notNull().default('simple'),
  language: text('language').notNull().default('en'),
  isPublic: boolean('is_public').notNull().default(false),
  tags: text('tags').notNull().default('[]'), // JSON array of strings
  autoRevealSeconds: integer('auto_reveal_seconds').notNull().default(5),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  front: text('front').notNull(),
  back: text('back'),
  choices: text('choices'), // JSON string
  explanation: text('explanation'),
  advancedNotes: text('advanced_notes'),
  mnemotechnic: text('mnemotechnic'), // Memory aid technique
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => studySessions.id, { onDelete: 'set null' }),
  rating: text('rating').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
  intervalDays: real('interval_days').notNull(),
  stability: real('stability').notNull(),
  difficulty: real('difficulty').notNull(),
  state: text('state'), // JSON string
})

export const studySessions = pgTable('study_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  secondsActive: integer('seconds_active').notNull().default(0),
})

export const deckScores = pgTable('deck_scores', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  window: text('window').notNull(),
  accuracyPct: real('accuracy_pct').notNull(),
  stabilityAvg: real('stability_avg').notNull(),
  lapses: integer('lapses').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const deckUsage = pgTable('deck_usage', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  window: text('window').notNull(),
  cardsReviewed: integer('cards_reviewed').notNull().default(0),
  studyHours: real('study_hours').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const deckEmbeddings = pgTable('deck_embeddings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  vector: vector('vector', { dimensions: 1536 }).notNull(),
  dim: integer('dim').notNull(),
  model: text('model').notNull(),
  contentHash: text('content_hash').notNull(), // SHA-256 hash of deck content for change detection
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const deckRankings = pgTable('deck_rankings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  window: text('window').notNull(),
  cardsReviewed: integer('cards_reviewed').notNull().default(0),
  hoursStudied: real('hours_studied').notNull().default(0),
  uniqueUsers: integer('unique_users').notNull().default(0),
  score: real('score').notNull().default(0), // 70% cards + 30% hours
  rank: integer('rank'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Type exports for PostgreSQL
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type AuthSession = typeof authSessions.$inferSelect
export type NewAuthSession = typeof authSessions.$inferInsert
export type ApiToken = typeof apiTokens.$inferSelect
export type NewApiToken = typeof apiTokens.$inferInsert
export type Deck = typeof decks.$inferSelect
export type NewDeck = typeof decks.$inferInsert
export type Card = typeof cards.$inferSelect
export type NewCard = typeof cards.$inferInsert
export type Review = typeof reviews.$inferSelect
export type NewReview = typeof reviews.$inferInsert
export type StudySession = typeof studySessions.$inferSelect
export type NewStudySession = typeof studySessions.$inferInsert
export type DeckScore = typeof deckScores.$inferSelect
export type NewDeckScore = typeof deckScores.$inferInsert
export type DeckEmbedding = typeof deckEmbeddings.$inferSelect
export type NewDeckEmbedding = typeof deckEmbeddings.$inferInsert
export type DeckRanking = typeof deckRankings.$inferSelect
export type NewDeckRanking = typeof deckRankings.$inferInsert

// User achievements tracking
export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull(),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow().notNull(),
  notified: boolean('notified').default(false).notNull(),
})

// User statistics for achievement tracking
export const userStats = pgTable('user_stats', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  totalSessions: integer('total_sessions').default(0).notNull(),
  totalCardsReviewed: integer('total_cards_reviewed').default(0).notNull(),
  totalCardsCreated: integer('total_cards_created').default(0).notNull(),
  decksCreated: integer('decks_created').default(0).notNull(),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastStudyDate: timestamp('last_study_date', { withTimezone: true }),
  perfectSessions: integer('perfect_sessions').default(0).notNull(),
  correctStreak: integer('correct_streak').default(0).notNull(),
  longestCorrectStreak: integer('longest_correct_streak').default(0).notNull(),
  nightSessions: integer('night_sessions').default(0).notNull(),
  earlySessions: integer('early_sessions').default(0).notNull(),
  weekendSessions: integer('weekend_sessions').default(0).notNull(),
  publicDecks: integer('public_decks').default(0).notNull(),
  languagesUsed: text('languages_used').default('[]').notNull(), // JSON array of language codes
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// User-specific deck stars (favorites)
export const userDeckStars = pgTable('user_deck_stars', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type UserAchievement = typeof userAchievements.$inferSelect
export type NewUserAchievement = typeof userAchievements.$inferInsert
export type UserStats = typeof userStats.$inferSelect
export type NewUserStats = typeof userStats.$inferInsert
export type UserDeckStar = typeof userDeckStars.$inferSelect
export type NewUserDeckStar = typeof userDeckStars.$inferInsert