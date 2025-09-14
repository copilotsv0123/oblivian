import { pgTable, text, integer, real, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
})

export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  level: text('level').notNull().default('simple'),
  language: text('language').notNull().default('en'),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  rating: text('rating').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  reviewedAt: timestamp('reviewed_at').defaultNow().notNull(),
  intervalDays: real('interval_days').notNull(),
  stability: real('stability').notNull(),
  difficulty: real('difficulty').notNull(),
  state: text('state'), // JSON string
})

export const studySessions = pgTable('study_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
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
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const deckUsage = pgTable('deck_usage', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  window: text('window').notNull(),
  cardsReviewed: integer('cards_reviewed').notNull().default(0),
  studyHours: real('study_hours').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const deckEmbeddings = pgTable('deck_embeddings', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  vector: text('vector').notNull(), // JSON string
  dim: integer('dim').notNull(),
  model: text('model').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Type exports for PostgreSQL
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