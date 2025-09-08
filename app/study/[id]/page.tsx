'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
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

interface StudyStats {
  due: number
  new: number
  total: number
}

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StudyStats>({ due: 0, new: 0, total: 0 })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionTime, setSessionTime] = useState(0)
  const [cardStartTime, setCardStartTime] = useState<number>(0)
  const [warning, setWarning] = useState<string | null>(null)
  const sessionStartTime = useRef<number>(0)
  const timerInterval = useRef<NodeJS.Timeout | null>(null)

  const initSession = useCallback(async () => {
    try {
      const sessionRes = await fetch(`/api/study/${resolvedParams.id}/session`, {
        method: 'POST',
      })
      if (!sessionRes.ok) {
        if (sessionRes.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to create session')
      }
      const sessionData = await sessionRes.json()
      setSessionId(sessionData.session.id)

      const queueRes = await fetch(`/api/study/${resolvedParams.id}/queue`)
      if (!queueRes.ok) {
        throw new Error('Failed to fetch study queue')
      }
      const queueData = await queueRes.json()
      setCards(queueData.cards)
      setStats(queueData.stats)
      setWarning(queueData.warning)
      
      // Start session timer
      sessionStartTime.current = Date.now()
      setCardStartTime(Date.now())
      
      // Start timer interval
      timerInterval.current = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - sessionStartTime.current) / 1000))
      }, 1000)
    } catch (error) {
      console.error('Error initializing study session:', error)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id, router])

  useEffect(() => {
    initSession()
    
    // Cleanup timer on unmount
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
    }
  }, [initSession])

  const handleReview = async (rating: 'again' | 'hard' | 'good' | 'easy' | 'skip') => {
    if (!cards[currentIndex]) return

    const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000)

    try {
      if (rating !== 'skip') {
        await fetch(`/api/study/${resolvedParams.id}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: cards[currentIndex].id,
            rating,
            sessionId,
            timeSpent,
          }),
        })
      }

      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowAnswer(false)
        setCardStartTime(Date.now())
      } else {
        // End session
        if (timerInterval.current) {
          clearInterval(timerInterval.current)
        }
        
        // Update session with total time
        await fetch(`/api/study/${resolvedParams.id}/session`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            secondsActive: sessionTime,
          }),
        })
        
        router.push(`/decks/${resolvedParams.id}`)
      }
    } catch (error) {
      console.error('Error recording review:', error)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <p className="text-gray-600">Loading study session...</p>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-accent flex flex-col items-center justify-center p-8">
        <div className="card max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">No Cards Due</h2>
          <p className="text-gray-600 mb-6">
            Great job! You&apos;ve reviewed all cards for today.
          </p>
          <Link href={`/decks/${resolvedParams.id}`} className="btn-primary">
            Back to Deck
          </Link>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]
  if (!currentCard) return null

  return (
    <div className="min-h-screen bg-accent flex flex-col">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={`/decks/${resolvedParams.id}`} className="text-primary hover:underline">
              ← Exit Study
            </Link>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-lg font-medium text-gray-700">{formatTime(sessionTime)}</span>
              </div>
              <div className="text-sm text-gray-600">
                Card {currentIndex + 1} of {cards.length}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {warning && (
          <div className="max-w-2xl w-full mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-yellow-800">{warning}</p>
            </div>
          </div>
        )}
        <div className="card max-w-2xl w-full">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500 uppercase">
                {currentCard.type.replace('_', ' ')}
              </span>
              <div className="flex gap-2 text-sm">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  Due: {stats.due}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  New: {stats.new}
                </span>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-medium text-primary mb-8">
              {currentCard.front}
            </h2>

            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                className="btn-primary px-8 py-3 text-lg"
              >
                Show Answer
              </button>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-gray-50 rounded-lg">
                  <div className="text-xl text-gray-800 prose prose-lg max-w-none">
                    <ReactMarkdown>
                      {currentCard.back || currentCard.explanation || 'No answer provided'}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => handleReview('again')}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Again
                    </button>
                    <button
                      onClick={() => handleReview('hard')}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Hard
                    </button>
                    <button
                      onClick={() => handleReview('good')}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Good
                    </button>
                    <button
                      onClick={() => handleReview('easy')}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Easy
                    </button>
                  </div>
                  <button
                    onClick={() => handleReview('skip')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                  >
                    Skip this card →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}