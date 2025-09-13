'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { MoreVertical, Trash2, Edit } from 'lucide-react'

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

  const fetchDeck = useCallback(async () => {
    try {
      const res = await fetch(`/api/decks/${resolvedParams.id}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch deck')
      }
      const data = await res.json()
      setDeck(data.deck)
      setCards(data.cards)
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
    fetchSimilarDecks()
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

  const startStudySession = () => {
    router.push(`/study/${resolvedParams.id}`)
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
              <div className="flex gap-4">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded">
                  {deck.level}
                </span>
                <span className="text-gray-600">
                  {cards.length} card{cards.length !== 1 ? 's' : ''}
                </span>
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

        <div className="flex gap-4 mb-8">
          <button
            onClick={startStudySession}
            className="btn-primary"
            disabled={cards.length === 0}
          >
            Start Study Session
          </button>
          <button
            onClick={() => setShowAddCard(true)}
            className="btn-outline"
          >
            + Card
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
            {cards.map((card) => (
              <div key={card.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {editingCard === card.id ? (
                      <div className="space-y-3">
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
                        <p 
                          className="text-primary font-medium mt-1 cursor-pointer hover:text-primary/80"
                          onClick={() => {
                            setEditingCard(card.id)
                            setEditValues({ front: card.front, back: card.back || '', advancedNotes: card.advancedNotes || '' })
                          }}
                        >
                          {card.front}
                        </p>
                        {card.back && (
                          <p 
                            className="text-gray-600 mt-2 cursor-pointer hover:text-gray-500"
                            onClick={() => {
                              setEditingCard(card.id)
                              setEditValues({ front: card.front, back: card.back || '' })
                            }}
                          >
                            {card.back}
                          </p>
                        )}
                      </>
                    )}
                  </div>
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
                          onClick={() => {
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
                          onClick={() => handleDeleteCard(card.id)}
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
            ))}
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