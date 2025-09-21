// Deck-related types for the Oblivian application

export interface DeckTag {
  name: string
}

export interface CreateDeckInput {
  userId: string
  title: string
  description?: string
  level?: 'simple' | 'mid' | 'expert'
  language?: string
  isPublic?: boolean
  tags?: string[] // Array of tag names
}

export interface UpdateDeckInput {
  title?: string
  description?: string
  level?: 'simple' | 'mid' | 'expert'
  language?: string
  isPublic?: boolean
  tags?: string[] // Array of tag names
}

export interface DeckWithTags {
  id: string
  ownerUserId: string
  title: string
  description: string | null
  level: string
  language: string
  isPublic: boolean
  tags: string[] // Parsed from JSON
  starred: boolean
  autoRevealSeconds: number
  createdAt: Date
  updatedAt: Date
  cardCount?: number
}

export interface DeckFilters {
  search?: string
  tags?: string[]
  starred?: boolean
  level?: 'simple' | 'mid' | 'expert'
  language?: string
}

// Tag utility functions
export const parseTagsFromJson = (tagsJson: string): string[] => {
  try {
    const parsed = JSON.parse(tagsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const tagsToJson = (tags: string[]): string => {
  return JSON.stringify(tags || [])
}

export const normalizeTags = (tags: string[]): string[] => {
  return tags
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0)
    .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
    .slice(0, 10) // Limit to 10 tags max
}

export const isValidTag = (tag: string): boolean => {
  return tag.trim().length > 0 && tag.trim().length <= 50 && /^[a-zA-Z0-9\s-_]+$/.test(tag.trim())
}