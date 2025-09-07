'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface RankedDeck {
  id: string
  title: string
  description?: string
  level: string
  rank?: number
  score: number
  stats: {
    cardsReviewed: number
    hoursStudied: number
    uniqueUsers: number
  }
}

export default function RankingsPage() {
  const [window, setWindow] = useState<'d7' | 'd30'>('d7')
  const [rankings, setRankings] = useState<RankedDeck[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRankings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rankings?window=${window}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setRankings(data.rankings || [])
      }
    } catch (error) {
      console.error('Error fetching rankings:', error)
    } finally {
      setLoading(false)
    }
  }, [window])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  const triggerUpdate = async () => {
    try {
      await fetch('/api/rankings', { method: 'POST' })
      await fetchRankings()
    } catch (error) {
      console.error('Error updating rankings:', error)
    }
  }

  return (
    <div className="min-h-screen bg-accent">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-primary hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-primary">Popular Decks</h1>
            <button
              onClick={triggerUpdate}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Update Rankings
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-4">Top Ranked Decks</h1>
          <p className="text-gray-600 mb-6">
            Discover the most popular decks based on community usage
          </p>

          {/* Time Window Selector */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setWindow('d7')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                window === 'd7'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setWindow('d30')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                window === 'd30'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-gray-600">Loading rankings...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No rankings available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rankings.map((deck, index) => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className="card flex items-center hover:shadow-lg transition-shadow"
              >
                {/* Rank Badge */}
                <div className="flex-shrink-0 mr-6">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      index === 0
                        ? 'bg-yellow-400 text-white'
                        : index === 1
                        ? 'bg-gray-300 text-gray-700'
                        : index === 2
                        ? 'bg-orange-400 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Deck Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-primary mb-1">
                    {deck.title}
                  </h3>
                  {deck.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                      {deck.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {deck.level}
                    </span>
                    <span>
                      {deck.stats.uniqueUsers} learner{deck.stats.uniqueUsers !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {deck.stats.cardsReviewed.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">cards reviewed</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {deck.stats.hoursStudied}h studied
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}