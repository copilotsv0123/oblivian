import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
})

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const decks = sqliteTable('decks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  level: text('level', { enum: ['simple', 'mid', 'expert'] }).notNull().default('simple'),
  language: text('language').notNull().default('en'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['basic', 'cloze', 'multiple_choice', 'explain'] }).notNull(),
  front: text('front').notNull(),
  back: text('back'),
  choices: text('choices', { mode: 'json' }),
  explanation: text('explanation'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cardId: text('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  rating: text('rating', { enum: ['again', 'hard', 'good', 'easy'] }).notNull(),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  intervalDays: real('interval_days').notNull(),
  stability: real('stability').notNull(),
  difficulty: real('difficulty').notNull(),
  state: text('state', { mode: 'json' }),
})

export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  startedAt: integer('started_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  secondsActive: integer('seconds_active').notNull().default(0),
})

export const deckScores = sqliteTable('deck_scores', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  window: text('window', { enum: ['d7', 'd30', 'd90'] }).notNull(),
  accuracyPct: real('accuracy_pct').notNull(),
  stabilityAvg: real('stability_avg').notNull(),
  lapses: integer('lapses').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const deckUsage = sqliteTable('deck_usage', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  window: text('window', { enum: ['d7', 'd30'] }).notNull(),
  cardsReviewed: integer('cards_reviewed').notNull().default(0),
  studyHours: real('study_hours').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const deckEmbeddings = sqliteTable('deck_embeddings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  vector: text('vector', { mode: 'json' }).notNull(),
  dim: integer('dim').notNull(),
  model: text('model').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const deckRankings = sqliteTable('deck_rankings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  window: text('window', { enum: ['d7', 'd30'] }).notNull(),
  cardsReviewed: integer('cards_reviewed').notNull().default(0),
  hoursStudied: real('hours_studied').notNull().default(0),
  uniqueUsers: integer('unique_users').notNull().default(0),
  score: real('score').notNull().default(0), // 70% cards + 30% hours
  rank: integer('rank'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
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