'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import StudyHeatmap from '@/components/StudyHeatmap'
import TagFilter from '@/components/TagFilter'
import { type Grade } from '@/lib/utils/grades'
import { deckRepo, type DeckResponse } from '@/lib/client/repositories'
import { useAuth } from '@/components/auth/AuthProvider'

interface DeckWithStats extends DeckResponse {
  cardCount?: number
  grade?: Grade | null
  bestAccuracy?: number | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [decks, setDecks] = useState<DeckWithStats[]>([])
  const [allDecks, setAllDecks] = useState<DeckWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showStarredOnly, setShowStarredOnly] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const fetchDecks = useCallback(async () => {
    try {
      const data = await deckRepo.getAll()
      setAllDecks(data.decks)
      setDecks(data.decks)

      // Extract unique tags from all decks
      const allTagsSet = new Set<string>()
      data.decks.forEach((deck: DeckResponse) => {
        if (deck.tags) {
          deck.tags.forEach((tag: string) => allTagsSet.add(tag))
        }
      })
      setAvailableTags(Array.from(allTagsSet).sort())
    } catch (error) {
      console.error('Error fetching decks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleStar = async (e: React.MouseEvent, deckId: string) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const data = await deckRepo.star(deckId)

      // Update both allDecks and decks
      const updateDecks = (deckList: DeckWithStats[]) =>
        deckList.map(d => d.id === deckId ? { ...d, starred: data.deck.starred } : d)

      setAllDecks(updateDecks)
      setDecks(updateDecks)
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const handleGenerateDeck = () => {
    setShowGenerateModal(true)
  }

  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  // Filter decks based on search query, starred filter, and tags
  useEffect(() => {
    let filtered = [...allDecks]

    // Apply starred filter
    if (showStarredOnly) {
      filtered = filtered.filter(deck => deck.starred)
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(deck =>
        deck.tags && selectedTags.some(tag => deck.tags.includes(tag))
      )
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(deck =>
        deck.title.toLowerCase().includes(query) ||
        (deck.description && deck.description.toLowerCase().includes(query)) ||
        deck.level.toLowerCase().includes(query) ||
        deck.language.toLowerCase().includes(query) ||
        (deck.tags && deck.tags.some(tag => tag.toLowerCase().includes(query)))
      )
    }

    setDecks(filtered)
  }, [allDecks, searchQuery, showStarredOnly, selectedTags])

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Study Heatmap */}
        <div className="mb-8">
          <StudyHeatmap />
        </div>

        {!loading && allDecks.length > 0 && (
          <div className="flex items-center gap-4 mb-8">
            <input
              type="text"
              placeholder="Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-80"
            />

            {/* Tag Filter next to search */}
            {availableTags.length > 0 && (
              <TagFilter
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                availableTags={availableTags}
              />
            )}

            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showStarredOnly}
                onChange={(e) => setShowStarredOnly(e.target.checked)}
                className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
              />
              <span className="text-sm text-gray-600">My favorites only</span>
            </label>

            {/* Generate Deck button - only visible for specific user */}
            {user?.id === '03fdc299-8363-4543-b7b0-e6fc61000401' && (
              <button
                onClick={handleGenerateDeck}
                className="btn-primary ml-auto whitespace-nowrap flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Generate Deck
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading decks...</p>
          </div>
        ) : decks.length === 0 ? (
          <div className="card text-center py-12">
            {allDecks.length === 0 ? (
              <>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No decks yet
                </h3>
                <p className="text-gray-600">
                  Create your first deck to start learning
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No decks match your search
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search to see more decks
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-secondary"
                >
                  Clear Search
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-[1px] md:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck, index) => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className={`card hover:shadow-lg hover:scale-[1.02] hover:z-10 transition-all duration-200 relative group ${
                  deck.starred
                    ? 'bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 legendary-border'
                    : 'hover:border-indigo-500 hover:card-hover-gradient'
                } ${index % 2 === 0 ? 'hover:rotate-1' : 'hover:-rotate-1'}`}
              >
                {/* Grade display */}
                {deck.grade && (
                  <div
                    className="absolute top-1 right-1 z-30 transform rotate-[5deg] group-hover:rotate-0 px-2 py-1 text-xs font-black rounded shadow-lg text-white border border-white/20 opacity-70 group-hover:opacity-100 transition-all duration-200"
                    style={{ backgroundColor: deck.grade.color }}
                  >
                    {deck.grade.label}
                  </div>
                )}

                {/* Star button */}
                <button
                  onClick={(e) => toggleStar(e, deck.id)}
                  className={`absolute ${deck.grade ? 'top-8 right-2' : 'top-2 right-2'} z-20 p-1.5 rounded-lg transition-all duration-200 ${
                    deck.starred
                      ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100 opacity-100'
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 opacity-0 group-hover:opacity-100'
                  }`}
                  aria-label={deck.starred ? 'Unstar deck' : 'Star deck'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill={deck.starred ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={deck.starred ? 0 : 1.5}
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>

                <div className="transition-all duration-200 group-hover:blur-[1px]">
                  <h3 className="text-xl font-semibold text-primary mb-2">
                    {deck.title}
                  </h3>
                  {deck.description && (
                    <p className="text-gray-600 mb-2">{deck.description}</p>
                  )}
                  {deck.tags && deck.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {deck.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {deck.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{deck.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {deck.cardCount !== undefined && (
                  <span className="absolute bottom-4 right-4 text-sm text-gray-400 transition-all duration-200 group-hover:blur-[1px]">
                    {deck.cardCount}
                  </span>
                )}
                {/* Hover overlay with button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="btn-glass px-6 py-3 transform scale-90 group-hover:scale-100 transition-transform duration-150">
                    Let&apos;s go! 🚀
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {showCreateModal && (
          <CreateDeckModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false)
              fetchDecks()
            }}
          />
        )}

        {showGenerateModal && (
          <GenerateDeckModal
            onClose={() => setShowGenerateModal(false)}
            onCreated={() => {
              setShowGenerateModal(false)
              fetchDecks()
            }}
          />
        )}
      </div>
    </AppLayout>
  )
}

function CreateDeckModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<'simple' | 'mid' | 'expert'>('simple')
  const [language, setLanguage] = useState('en')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await deckRepo.create({ title, description, level, language, isPublic })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h3 className="text-2xl font-bold text-primary mb-4">Create New Deck</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="label">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="label">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input h-24 resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="level" className="label">Difficulty Level</label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="input"
              disabled={loading}
            >
              <option value="simple">Simple</option>
              <option value="mid">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div>
            <label htmlFor="language" className="label">Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input"
              disabled={loading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
              disabled={loading}
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              Make this deck publicly visible
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Deck'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GenerateDeckModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [cardCount, setCardCount] = useState(10)
  const [difficulty, setDifficulty] = useState<'simple' | 'intermediate' | 'advanced'>('intermediate')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Step 1: Generate the deck using LLM API
      const generateResponse = await fetch('/api/llm/generate-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          description,
          cardCount,
          difficulty,
          language: 'en', // Default to English
        }),
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        throw new Error(errorData.error || 'Failed to generate deck')
      }

      const deckData = await generateResponse.json()

      if (!deckData.success || !deckData.deck || !deckData.cards) {
        throw new Error('Invalid response from generation service')
      }

      // Step 2: Create the deck in the database
      const createdDeck = await deckRepo.create({
        title: deckData.deck.title,
        description: deckData.deck.description,
        level: difficulty,
        language: 'en',
        isPublic,
      })

      // Step 3: Add the generated cards to the deck
      const cardPromises = deckData.cards.map((card: any) => {
        console.log('Creating card with data:', card) // Debug log

        if (!card.front) {
          console.error('Card missing front field:', card)
          throw new Error(`Card is missing required 'front' field`)
        }

        return fetch('/api/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deckId: createdDeck.deck.id,
            type: 'basic',
            front: card.front,
            back: card.back || '',
            advancedNotes: card.advancedNotes || '',
            mnemonics: card.mnemonics || '',
          }),
        })
      })

      await Promise.all(cardPromises)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-primary">Generate AI Deck</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="topic" className="label">Topic *</label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input"
              placeholder="e.g., JavaScript fundamentals, Spanish vocabulary..."
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Describe what you want to learn about
            </p>
          </div>

          <div>
            <label htmlFor="description" className="label">Additional Context (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input h-20 resize-none"
              placeholder="Any specific focus areas or requirements..."
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cardCount" className="label">Number of Cards</label>
              <select
                id="cardCount"
                value={cardCount}
                onChange={(e) => setCardCount(parseInt(e.target.value))}
                className="input"
                disabled={loading}
              >
                <option value={5}>5 cards</option>
                <option value={10}>10 cards</option>
                <option value={15}>15 cards</option>
                <option value={20}>20 cards</option>
                <option value={25}>25 cards</option>
              </select>
            </div>

            <div>
              <label htmlFor="difficulty" className="label">Difficulty</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="input"
                disabled={loading}
              >
                <option value="simple">Simple</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
              disabled={loading}
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              Make this deck publicly visible
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Generating...
                </div>
              ) : (
                'Generate Deck with AI'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}