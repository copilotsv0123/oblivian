'use client'

import { useState, useEffect, use, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import StudyCompletionOverlay from '@/components/StudyCompletionOverlay'
import { ApiError } from '@/lib/client/api-client'
import { formatTime } from '@/lib/utils/time'
import { deckRepo, reviewRepo, sessionRepo, studyRepo } from '@/lib/client/repositories'

interface Card {
  id: string
  type: string
  front: string
  back?: string
  choices?: string
  explanation?: string
  advancedNotes?: string
  mnemonics?: string
}

interface StudyStats {
  due: number
  new: number
  total: number
}

interface DeckMetadata {
  title?: string
  autoRevealSeconds?: number | null
}

type ReviewActionRating = 'again' | 'hard' | 'good' | 'easy' | 'skip'

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedConfidence, setSelectedConfidence] = useState<'good' | 'easy' | 'dont_know' | null>(null)
  const [frozenTime, setFrozenTime] = useState<number>(0)
  const [showAdvancedNotes, setShowAdvancedNotes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StudyStats>({ due: 0, new: 0, total: 0 })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionTime, setSessionTime] = useState(0)
  const [cardStartTime, setCardStartTime] = useState<number>(0)
  const [warning, setWarning] = useState<string | null>(null)
  const [deckTitle, setDeckTitle] = useState<string>('')
  const [autoRevealSeconds, setAutoRevealSeconds] = useState<number>(5)
  const [timeRemaining, setTimeRemaining] = useState<number>(5)
  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const sessionStartTime = useRef<number>(0)
  const timerInterval = useRef<NodeJS.Timeout | null>(null)
  const autoAnswerTimer = useRef<NodeJS.Timeout | null>(null)

  const initSession = useCallback(async () => {
    try {
      const sessionData = await sessionRepo.create(resolvedParams.id)
      setSessionId(sessionData.session.id)

      const queueData = await studyRepo.getQueue<Card>(resolvedParams.id)
      setCards(queueData.cards)
      setStats(queueData.stats)
      setWarning(queueData.warning)

      try {
        const deckData = await deckRepo.getById<DeckMetadata>(resolvedParams.id)
        if (deckData?.deck) {
          const revealSeconds = deckData.deck.autoRevealSeconds ?? 5
          setDeckTitle(deckData.deck.title ?? '')
          setAutoRevealSeconds(revealSeconds)
          setTimeRemaining(revealSeconds)
        }
      } catch (deckError) {
        console.error('Error fetching deck details:', deckError)
      }

      // Start session timer
      sessionStartTime.current = Date.now()
      setCardStartTime(Date.now())

      // Start timer interval
      timerInterval.current = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - sessionStartTime.current) / 1000))
      }, 1000)

      // Auto-answer timer will be started via useEffect
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const returnUrl = encodeURIComponent(`/study/${resolvedParams.id}`)
        router.push(`/login?returnUrl=${returnUrl}`)
        return
      }
      console.error('Error initializing study session:', error)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id, router])

  useEffect(() => {
    initSession()

    // Cleanup timers on unmount
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
      if (autoAnswerTimer.current) {
        clearTimeout(autoAnswerTimer.current)
      }
    }
  }, [initSession])

  const handleConfidenceSelect = useCallback((confidence: 'good' | 'easy' | 'dont_know') => {
    // Clear auto-answer timer
    if (autoAnswerTimer.current) {
      clearTimeout(autoAnswerTimer.current)
      autoAnswerTimer.current = null
    }

    const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000)
    setFrozenTime(timeSpent)
    setSelectedConfidence(confidence)
    setShowAnswer(true)
    setShowAdvancedNotes(true) // Always show advanced notes when answer is revealed
  }, [cardStartTime])

  // Update countdown timer
  useEffect(() => {
    if (!showAnswer && cards.length > 0 && currentIndex < cards.length) {
      const countdownInterval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 0.1)
          return newTime
        })
      }, 100)

      return () => clearInterval(countdownInterval)
    }
  }, [showAnswer, currentIndex, cards.length])

  // Start auto-answer timer when showing a new card
  useEffect(() => {
    if (!showAnswer && cards.length > 0 && currentIndex < cards.length) {
      // Clear any existing timer
      if (autoAnswerTimer.current) {
        clearTimeout(autoAnswerTimer.current)
      }

      // Start new timer
      autoAnswerTimer.current = setTimeout(() => {
        handleConfidenceSelect('dont_know')
      }, autoRevealSeconds * 1000)

      return () => {
        if (autoAnswerTimer.current) {
          clearTimeout(autoAnswerTimer.current)
        }
      }
    }
  }, [showAnswer, currentIndex, cards.length, handleConfidenceSelect, autoRevealSeconds])

  const handleReview = useCallback(async (rating: ReviewActionRating) => {
    if (!cards[currentIndex]) return

    const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000)
    const currentCardId = cards[currentIndex].id

    // Update UI immediately (optimistic update)
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowAnswer(false)
      setSelectedConfidence(null)
      setShowAdvancedNotes(false)
      setFrozenTime(0)
      setTimeRemaining(autoRevealSeconds)
      setCardStartTime(Date.now())

      // Start auto-answer timer for next card
      autoAnswerTimer.current = setTimeout(() => {
        handleConfidenceSelect('dont_know')
      }, autoRevealSeconds * 1000)
    } else {
      // End session - wait for completion before showing overlay
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }

      // For the last card, we need to wait for both API calls to complete
      // before showing the achievement overlay
      const promises: Promise<unknown>[] = []

      if (rating !== 'skip') {
        promises.push(
          reviewRepo.submit(resolvedParams.id, {
            cardId: currentCardId,
            rating,
            sessionId: sessionId ?? undefined,
            timeSpent,
          })
        )
      }

      if (sessionId) {
        promises.push(
          sessionRepo.update(resolvedParams.id, {
            sessionId,
            secondsActive: sessionTime,
          })
        )
      }

      // Wait for all API calls to complete before showing achievement
      Promise.all(promises)
        .then(() => {
          setShowCompletionScreen(true)
        })
        .catch(error => {
          console.error('Error completing session:', error)
          // Still show completion screen even if APIs fail
          setShowCompletionScreen(true)
        })

      return // Don't execute the async API calls below for last card
    }

    // Send API calls asynchronously (fire and forget) for non-last cards
    if (rating !== 'skip') {
      reviewRepo
        .submit(resolvedParams.id, {
          cardId: currentCardId,
          rating,
          sessionId: sessionId ?? undefined,
          timeSpent,
        })
        .catch(error => {
          console.error('Error recording review:', error)
        })
    }
  }, [cards, currentIndex, cardStartTime, resolvedParams.id, sessionId, sessionTime, handleConfidenceSelect, autoRevealSeconds])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Prevent default behavior for our shortcuts
      if (['Space', 'Digit1', 'Digit2', 'Digit3', 'Escape'].includes(e.code)) {
        e.preventDefault()
      }

      // Confidence selection (before answer is shown)
      if (!showAnswer) {
        switch (e.code) {
          case 'Digit1':
            handleConfidenceSelect('dont_know')
            break
          case 'Digit2':
            handleConfidenceSelect('good')
            break
          case 'Digit3':
            handleConfidenceSelect('easy')
            break
        }
      }

      // Handle "I don't know" case - Space to continue
      if (showAnswer && selectedConfidence === 'dont_know') {
        if (e.code === 'Space') {
          handleReview('again')
          return
        }
      }

      // Review ratings (only when answer is shown and not "don't know")
      if (showAnswer && selectedConfidence !== 'dont_know') {
        switch (e.code) {
          case 'Digit1':
            handleReview('again')
            break
          case 'Digit2':
            handleReview('easy')
            break
        }
      }

      // Exit study session with Escape
      if (e.code === 'Escape') {
        router.push(`/decks/${resolvedParams.id}`)
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [showAnswer, showAdvancedNotes, selectedConfidence, cards, currentIndex, handleReview, handleConfidenceSelect, router, resolvedParams.id])


  if (loading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <p className="text-gray-600">Loading study session...</p>
      </div>
    )
  }

  if (showCompletionScreen && sessionId) {
    return (
      <StudyCompletionOverlay
        isVisible={showCompletionScreen}
        deckId={resolvedParams.id}
        sessionId={sessionId}
        deckTitle={deckTitle}
        onComplete={() => router.push(`/decks/${resolvedParams.id}`)}
      />
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link href={`/decks/${resolvedParams.id}`} className="text-primary hover:underline text-sm sm:text-base whitespace-nowrap">
                ← Exit
              </Link>
              {deckTitle && (
                <>
                  <div className="text-gray-400 hidden sm:block">|</div>
                  <h1 className="text-sm sm:text-lg font-semibold text-gray-800 truncate">{deckTitle}</h1>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-6">
              <div className="flex items-center gap-1 sm:gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm sm:text-lg font-medium text-gray-700">{formatTime(sessionTime)}</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {currentIndex + 1}/{cards.length}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 pt-8 sm:pt-20">
        {warning && (
          <div className="max-w-2xl w-full mb-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
            
            <div className="w-full bg-muted rounded-full h-2 mb-6">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-lg sm:text-2xl font-medium text-primary mb-2">
              {currentCard.front}
            </h2>


            {!showAnswer ? (
              <div className="space-y-4">
                <div className="w-24 sm:w-32 h-0.5 bg-gray-300 mx-auto my-6 sm:my-8"></div>

                {/* Auto-answer countdown timer */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="relative">
                    <svg className="w-10 h-10 transform -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="100.53"
                        strokeDashoffset={`${100.53 - (timeRemaining / autoRevealSeconds) * 100.53}`}
                        className="text-primary transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                      {Math.ceil(timeRemaining)}
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">How confident are you about your answer?</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
                  <button
                    onClick={() => handleConfidenceSelect('dont_know')}
                    className="px-4 py-3 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    I don&apos;t know
                    <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs hidden sm:inline">1</kbd>
                  </button>
                  <button
                    onClick={() => handleConfidenceSelect('good')}
                    className="px-4 py-3 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    I think I know
                    <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs hidden sm:inline">2</kbd>
                  </button>
                  <button
                    onClick={() => handleConfidenceSelect('easy')}
                    className="px-4 py-3 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    I know
                    <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs hidden sm:inline">3</kbd>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6 relative">
                <div className="p-4 sm:p-6 bg-gray-50 rounded-lg">
                  <div className="text-base sm:text-xl text-gray-800 prose prose-sm sm:prose-lg max-w-none">
                    <ReactMarkdown>
                      {currentCard.back || currentCard.explanation || 'No answer provided'}
                    </ReactMarkdown>
                  </div>
                </div>

                {selectedConfidence === 'dont_know' ? (
                  <div className="text-center py-3 sm:py-4">
                    <button
                      onClick={() => handleReview('again')}
                      className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mx-auto text-sm sm:text-base"
                    >
                      Next Card
                      <kbd className="px-2 py-1 bg-white/20 rounded text-xs sm:text-sm hidden sm:inline">Space</kbd>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-center text-gray-600 text-xs sm:text-sm">
                      {selectedConfidence === 'good' ? 'Did you actually know it?' : 'Did you really know it?'}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => handleReview('again')}
                        className="px-6 py-2.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        No
                        <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs hidden sm:inline">1</kbd>
                      </button>
                      <button
                        onClick={() => handleReview('easy')}
                        className="px-6 py-2.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        Yes
                        <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs hidden sm:inline">2</kbd>
                      </button>
                    </div>
                  </div>
                )}

                {currentCard.advancedNotes && (
                  <div className="p-3 sm:p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="prose prose-sm sm:prose-lg max-w-none text-gray-700 dark:text-gray-300">
                      <ReactMarkdown>
                        {currentCard.advancedNotes}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {currentCard.mnemonics && (
                  <div className="p-3 sm:p-4 bg-amber-50 rounded-lg border border-amber-200 relative">
                    <span className="absolute -top-2 -right-2 text-2xl rotate-12 hover:animate-spin transition-all duration-300">💡</span>
                    <div className="prose prose-sm sm:prose-lg max-w-none text-gray-700 dark:text-gray-300 pr-6">
                      <ReactMarkdown>
                        {currentCard.mnemonics}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Time taken in bottom right */}
                <div className="text-right">
                  <span className="text-xs text-gray-500">
                    {frozenTime}s
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}