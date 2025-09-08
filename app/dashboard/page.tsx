'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'

interface Deck {
  id: string
  title: string
  description: string | null
  level: string
  language: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  cardCount?: number
}

export default function DashboardPage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [allDecks, setAllDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [languageFilter, setLanguageFilter] = useState<string>('all')

  const fetchDecks = useCallback(async () => {
    try {
      const res = await fetch('/api/decks')
      if (!res.ok) {
        throw new Error('Failed to fetch decks')
      }
      const data = await res.json()
      setAllDecks(data.decks)
      setDecks(data.decks)
    } catch (error) {
      console.error('Error fetching decks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  // Filter decks based on selected filters
  useEffect(() => {
    let filtered = allDecks

    if (levelFilter !== 'all') {
      filtered = filtered.filter(deck => deck.level === levelFilter)
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(deck => deck.language === languageFilter)
    }

    setDecks(filtered)
  }, [allDecks, levelFilter, languageFilter])

  // Get unique languages from all decks for filter dropdown
  const availableLanguages = Array.from(
    new Set(allDecks.map(deck => deck.language))
  ).sort()

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-primary">My Decks</h2>
          <div className="flex gap-3">
            <Link
              href="/rankings"
              className="btn-outline"
            >
              Browse Popular
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Deck
            </button>
          </div>
        </div>

        {/* Filters */}
        {!loading && allDecks.length > 0 && (
          <div className="card mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label htmlFor="level-filter" className="text-sm font-medium text-gray-700">
                  Level:
                </label>
                <select
                  id="level-filter"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="input text-sm py-1 px-2 min-w-[120px]"
                >
                  <option value="all">All Levels</option>
                  <option value="simple">Simple</option>
                  <option value="mid">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label htmlFor="language-filter" className="text-sm font-medium text-gray-700">
                  Language:
                </label>
                <select
                  id="language-filter"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="input text-sm py-1 px-2 min-w-[120px]"
                >
                  <option value="all">All Languages</option>
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang === 'en' ? 'English' :
                       lang === 'es' ? 'Spanish' :
                       lang === 'fr' ? 'French' :
                       lang === 'de' ? 'German' :
                       lang === 'it' ? 'Italian' :
                       lang === 'pt' ? 'Portuguese' :
                       lang === 'ru' ? 'Russian' :
                       lang === 'zh' ? 'Chinese' :
                       lang === 'ja' ? 'Japanese' :
                       lang === 'ko' ? 'Korean' :
                       lang.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {(levelFilter !== 'all' || languageFilter !== 'all') && (
                <button
                  onClick={() => {
                    setLevelFilter('all')
                    setLanguageFilter('all')
                  }}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  Clear filters
                </button>
              )}

              <div className="ml-auto text-sm text-gray-600">
                Showing {decks.length} of {allDecks.length} decks
              </div>
            </div>
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
                <p className="text-gray-600 mb-4">
                  Create your first deck to start learning
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-secondary"
                >
                  Create Your First Deck
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No decks match your filters
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters to see more decks
                </p>
                <button
                  onClick={() => {
                    setLevelFilter('all')
                    setLanguageFilter('all')
                  }}
                  className="btn-secondary"
                >
                  Clear All Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className="card hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-primary mb-2">
                  {deck.title}
                </h3>
                {deck.description && (
                  <p className="text-gray-600 mb-3">{deck.description}</p>
                )}
                <div className="flex gap-2 text-sm flex-wrap">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                    {deck.level}
                  </span>
                  <span className="px-2 py-1 bg-secondary/10 text-secondary-dark rounded">
                    {deck.language}
                  </span>
                  {deck.cardCount !== undefined && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {deck.cardCount} card{deck.cardCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs ${
                    deck.isPublic 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {deck.isPublic ? 'Public' : 'Private'}
                  </span>
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
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, level, language, isPublic }),
      })

      if (!res.ok) {
        throw new Error('Failed to create deck')
      }

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