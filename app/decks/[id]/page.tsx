'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

interface Card {
  id: string
  type: string
  front: string
  back?: string
  choices?: string
  explanation?: string
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [similarDecks, setSimilarDecks] = useState<any[]>([])

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

  const startStudySession = () => {
    router.push(`/study/${resolvedParams.id}`)
  }

  const handleDeleteDeck = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/decks/${resolvedParams.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to delete deck')
      }
      router.push('/dashboard')
    } catch (error) {
      console.error('Error deleting deck:', error)
      alert('Failed to delete deck')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
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
      if (!res.ok) {
        throw new Error('Failed to delete card')
      }
      // Refresh the deck data
      fetchDeck()
    } catch (error) {
      console.error('Error deleting card:', error)
      alert('Failed to delete card')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <p className="text-gray-600">Loading deck...</p>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <p className="text-gray-600">Deck not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-accent">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-primary hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card mb-8">
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
            Add Card Manually
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete Deck
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="card text-center py-12">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No cards yet
            </h3>
            <p className="text-gray-600 mb-4">
              Add cards manually or use Claude Desktop with MCP to generate cards with AI
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
                    <span className="text-sm text-gray-500 uppercase">
                      {card.type.replace('_', ' ')}
                    </span>
                    <p className="text-primary font-medium mt-1">{card.front}</p>
                    {card.back && (
                      <div className="text-gray-600 mt-2 prose prose-sm max-w-none">
                        <span className="font-medium">Answer: </span>
                        <ReactMarkdown>{card.back}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="ml-4 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
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
      </main>

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

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h3 className="text-2xl font-bold text-red-600 mb-4">Delete Deck</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete &quot;{deck?.title}&quot;? This action cannot be undone and will delete all cards in this deck.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteDeck}
                className="btn-primary bg-red-500 hover:bg-red-600 flex-1"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Deck'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-outline flex-1"
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
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