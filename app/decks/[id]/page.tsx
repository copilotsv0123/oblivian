'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { MoreVertical, Trash2, Edit, ChevronDown, ChevronUp, Calendar, Trophy, TrendingUp, Layers, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import Tooltip from '@/components/Tooltip'

interface Card {
  id: string
  type: string
  front: string
  back?: string
  choices?: string
  explanation?: string
  advancedNotes?: string
}

interface Deck {
  id: string
  title: string
  description: string | null
  level: string
}

interface DeckStats {
  lastStudyDate: string | null
  totalSessions: number
  totalCardsReviewed: number
  performanceGrade: string | null
  successRate: number | null
  reviewCount: number
}

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [similarDecks, setSimilarDecks] = useState<any[]>([])
  const [showDeckMenu, setShowDeckMenu] = useState(false)
  const [showCardMenu, setShowCardMenu] = useState<string | null>(null)
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ front: string; back: string; advancedNotes?: string }>({ front: '', back: '' })
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<DeckStats | null>(null)
  const [cardPerformance, setCardPerformance] = useState<Record<string, {
    difficulty: 'easy' | 'medium' | 'hard' | 'unreviewed'
    successRate: number
    recentReviews: Array<'again' | 'hard' | 'good' | 'easy'>
  }>>({})

  const fetchDeck = useCallback(async () => {
    try {
      const [deckRes, statsRes, perfRes] = await Promise.all([
        fetch(`/api/decks/${resolvedParams.id}`),
        fetch(`/api/decks/${resolvedParams.id}/stats`),
        fetch(`/api/decks/${resolvedParams.id}/card-performance`)
      ])

      if (!deckRes.ok) {
        if (deckRes.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch deck')
      }

      const deckData = await deckRes.json()
      setDeck(deckData.deck)
      setCards(deckData.cards)

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }

      if (perfRes.ok) {
        const perfData = await perfRes.json()
        setCardPerformance(perfData.cardPerformance || {})
      }
    } catch (error) {
      console.error('Error fetching deck:', error)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id, router])

  const fetchSimilarDecks = useCallback(async () => {
    try {
      const res = await fetch(`/api/decks/${resolvedParams.id}/similar`)
      if (res.ok) {
        const data = await res.json()
        setSimilarDecks(data.decks || [])
      }
    } catch (error) {
      console.error('Error fetching similar decks:', error)
    }
  }, [resolvedParams.id])

  useEffect(() => {
    fetchDeck()
    // fetchSimilarDecks() // Disabled until OpenAI integration is complete
  }, [fetchDeck, fetchSimilarDecks])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDeckMenu(false)
      setShowCardMenu(null)
    }

    if (showDeckMenu || showCardMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDeckMenu, showCardMenu])

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffSeconds < 60) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`
    if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'text-green-600'
      case 'A': return 'text-green-500'
      case 'B': return 'text-blue-500'
      case 'C': return 'text-yellow-500'
      case 'D': return 'text-orange-500'
      case 'F': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const startStudySession = () => {
    router.push(`/study/${resolvedParams.id}?limit=10`)
  }

  const handleDeleteDeck = async () => {
    if (!confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
      return
    }
    
    try {
      const res = await fetch(`/api/decks/${resolvedParams.id}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error deleting deck:', error)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) {
      return
    }
    
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      })
      
      if (res.ok) {
        setCards(cards.filter(c => c.id !== cardId))
        setShowCardMenu(null)
      }
    } catch (error) {
      console.error('Error deleting card:', error)
    }
  }

  const handleUpdateCard = async (cardId: string) => {
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      })
      
      if (res.ok) {
        fetchDeck()
        setEditingCard(null)
      }
    } catch (error) {
      console.error('Error updating card:', error)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-accent flex items-center justify-center">
          <p className="text-gray-600">Loading deck...</p>
        </div>
      </AppLayout>
    )
  }

  if (!deck) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-accent flex items-center justify-center">
          <p className="text-gray-600">Deck not found</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card mb-8 relative">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-primary mb-2">{deck.title}</h1>
              {deck.description && (
                <p className="text-gray-600 mb-4">{deck.description}</p>
              )}
              {/* Study Statistics */}
              <div className="flex flex-wrap gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Cards</p>
                    <p className="text-sm font-medium">{cards.length}</p>
                  </div>
                </div>

                {stats && (
                  <>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Last studied</p>
                        <p className="text-sm font-medium">{formatRelativeTime(stats.lastStudyDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Sessions</p>
                        <p className="text-sm font-medium">{stats.totalSessions}</p>
                      </div>
                    </div>

                    {stats.performanceGrade && (
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Performance</p>
                        <p className={`text-sm font-bold ${getGradeColor(stats.performanceGrade)}`}>
                          Grade {stats.performanceGrade}
                          {stats.successRate !== null && (
                            <span className="text-xs font-normal text-gray-500 ml-1">
                              ({stats.successRate}%)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                    {!stats.performanceGrade && stats.reviewCount > 0 && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Performance</p>
                          <p className="text-sm text-gray-400">
                            {10 - stats.reviewCount} more reviews needed
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeckMenu(!showDeckMenu)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
              {showDeckMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                  <button
                    onClick={handleDeleteDeck}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Deck
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={startStudySession}
            className="btn-primary text-lg px-8 py-3"
            disabled={cards.length === 0}
          >
            Start Study Session
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="card text-center py-12">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No cards yet
            </h3>
            <p className="text-gray-600 mb-4">
              Add cards to start studying this deck
            </p>
            <button
              onClick={() => setShowAddCard(true)}
              className="btn-secondary"
            >
              Add Your First Card
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-primary">Cards</h2>
            <div className="grid gap-[1px] md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card, index) => {
                const perf = cardPerformance[card.id]

                return (
                  <div
                    key={card.id}
                    className={`card transition-colors relative ${card.advancedNotes && editingCard !== card.id ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => {
                  if (card.advancedNotes && editingCard !== card.id) {
                    const newExpanded = new Set(expandedCards)
                    if (newExpanded.has(card.id)) {
                      newExpanded.delete(card.id)
                    } else {
                      newExpanded.add(card.id)
                    }
                    setExpandedCards(newExpanded)
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {editingCard === card.id ? (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editValues.front}
                          onChange={(e) => setEditValues({ ...editValues, front: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Question"
                        />
                        <input
                          type="text"
                          value={editValues.back}
                          onChange={(e) => setEditValues({ ...editValues, back: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Answer"
                        />
                        <textarea
                          value={editValues.advancedNotes || ''}
                          onChange={(e) => setEditValues({ ...editValues, advancedNotes: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg resize-vertical min-h-[80px]"
                          placeholder="Advanced Notes (optional): Add deeper insights, related concepts, or additional examples"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateCard(card.id)}
                            className="btn-primary text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCard(null)}
                            className="btn-outline text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-primary font-medium mt-1">
                            {card.front}
                          </p>
                          <div className="text-gray-600 mt-2">
                            <span>{card.back || ''}</span>
                            {card.advancedNotes && (
                              <span className="inline-flex items-center gap-0.5 ml-2 text-sm text-indigo-600 align-middle">
                                <span className="text-xs">{expandedCards.has(card.id) ? 'Less' : 'More'}</span>
                                {expandedCards.has(card.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </div>
                          {card.advancedNotes && expandedCards.has(card.id) && (
                            <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                              <p className="text-gray-700 whitespace-pre-wrap">{card.advancedNotes}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Performance indicator icon */}
                  {perf && perf.recentReviews.length > 0 && (
                    <div className="absolute bottom-3 right-3">
                      {perf.difficulty === 'easy' ? (
                        <Tooltip content={`Easy - ${Math.round(perf.successRate * 100)}% success rate`}>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </Tooltip>
                      ) : perf.difficulty === 'medium' ? (
                        <Tooltip content={`Medium - ${Math.round(perf.successRate * 100)}% success rate`}>
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                        </Tooltip>
                      ) : perf.difficulty === 'hard' ? (
                        <Tooltip content={`Hard - ${Math.round(perf.successRate * 100)}% success rate`}>
                          <XCircle className="w-5 h-5 text-red-500" />
                        </Tooltip>
                      ) : null}
                    </div>
                  )}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCardMenu(showCardMenu === card.id ? null : card.id)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>
                    {showCardMenu === card.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingCard(card.id)
                            setEditValues({ front: card.front, back: card.back || '', advancedNotes: card.advancedNotes || '' })
                            setShowCardMenu(null)
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Card
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCard(card.id)
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Card
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                )
              })}
            </div>
          </div>
        )}
        {/* Similar Decks Section */}
        {similarDecks.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-primary mb-4">Similar Decks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarDecks.map((deck) => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-semibold text-primary mb-2">{deck.title}</h3>
                  {deck.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {deck.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {deck.level}
                    </span>
                    <span>
                      {Math.round((deck.similarity || 0) * 100)}% match
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {showAddCard && (
          <AddCardModal
            deckId={resolvedParams.id}
            onClose={() => setShowAddCard(false)}
            onAdded={() => {
              setShowAddCard(false)
              fetchDeck()
            }}
          />
        )}
      </main>
    </AppLayout>
  )
}

function AddCardModal({
  deckId,
  onClose,
  onAdded,
}: {
  deckId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [type, setType] = useState<'basic' | 'cloze'>('basic')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId, type, front, back }),
      })

      if (!res.ok) {
        throw new Error('Failed to add card')
      }

      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-primary mb-4">Add New Card</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="label">Card Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="input"
              disabled={loading}
            >
              <option value="basic">Basic (Front/Back)</option>
              <option value="cloze">Cloze (Fill in the blank)</option>
            </select>
          </div>

          <div>
            <label htmlFor="front" className="label">
              {type === 'cloze' ? 'Question (use {{...}} for blanks)' : 'Front'}
            </label>
            <textarea
              id="front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className="input h-24 resize-none"
              required
              disabled={loading}
              placeholder={type === 'cloze' ? 'The capital of France is {{Paris}}' : 'What is the capital of France?'}
            />
          </div>

          <div>
            <label htmlFor="back" className="label">
              {type === 'cloze' ? 'Answer' : 'Back'}
            </label>
            <textarea
              id="back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="input h-24 resize-none"
              required
              disabled={loading}
              placeholder={type === 'cloze' ? 'Paris' : 'Paris'}
            />
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
              {loading ? 'Adding...' : 'Add Card'}
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