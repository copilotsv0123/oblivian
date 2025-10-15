'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { quizRepo, reviewRepo, deckRepo } from '@/lib/client/repositories'
import type { QuizItem, MultipleChoiceQuizItem, FillBlankQuizItem, TrueFalseQuizItem } from '@/lib/types/quiz'
import type { QuizQueueStats } from '@/lib/client/repositories/quiz-repository'
import { ApiError } from '@/lib/client/api-client'

interface DeckMetadata {
  title?: string
}

type QuizResult = 'correct' | 'incorrect' | null

function normalizeInput(value: string) {
  return value.trim().toLowerCase()
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [items, setItems] = useState<QuizItem[]>([])
  const [stats, setStats] = useState<QuizQueueStats>({ due: 0, new: 0, total: 0 })
  const [warning, setWarning] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [result, setResult] = useState<QuizResult>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [fillBlankAnswer, setFillBlankAnswer] = useState('')
  const [trueFalseSelection, setTrueFalseSelection] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deckTitle, setDeckTitle] = useState('')
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const deckId = resolvedParams.id

  useEffect(() => {
    const initialise = async () => {
      try {
        const [queueData, deckData] = await Promise.all([
          quizRepo.getQueue<QuizItem>(deckId),
          deckRepo.getById<DeckMetadata>(deckId).catch((err) => {
            if (err instanceof ApiError && err.status === 401) {
              const returnUrl = encodeURIComponent(`/quiz/${deckId}`)
              router.push(`/login?returnUrl=${returnUrl}`)
              return null
            }
            throw err
          }),
        ])

        if (queueData) {
          setItems(queueData.items)
          setStats(queueData.stats)
          setWarning(queueData.warning)
        }

        if (deckData?.deck) {
          setDeckTitle(deckData.deck.title ?? '')
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const returnUrl = encodeURIComponent(`/quiz/${deckId}`)
          router.push(`/login?returnUrl=${returnUrl}`)
          return
        }
        console.error('Error initialising quiz:', error)
      } finally {
        setLoading(false)
      }
    }

    initialise()
  }, [deckId, router])

  const currentItem = items[currentIndex] ?? null
  const hasItems = items.length > 0
  const isComplete = hasItems && currentIndex >= items.length

  const submitResult = useCallback(async (isCorrect: boolean) => {
    if (!currentItem) return

    setAttempts((previous) => previous + 1)
    if (isCorrect) {
      setScore((previous) => previous + 1)
    }

    setResult(isCorrect ? 'correct' : 'incorrect')
    setShowExplanation(true)
    setSubmissionError(null)

    try {
      await reviewRepo.submit(deckId, {
        cardId: currentItem.cardId,
        rating: isCorrect ? 'good' : 'again',
      })
    } catch (error) {
      console.error('Failed to submit quiz review:', error)
      setSubmissionError('We recorded your answer locally but failed to sync with the server. Please retry later.')
    }
  }, [currentItem, deckId])

  const handleMultipleChoice = useCallback((item: MultipleChoiceQuizItem, choiceId: string) => {
    if (result) return
    setSelectedChoiceId(choiceId)
    const isCorrect = choiceId === item.correctChoiceId
    submitResult(isCorrect)
  }, [result, submitResult])

  const handleFillBlankSubmit = useCallback((item: FillBlankQuizItem) => {
    if (result) return

    const normalizedInput = normalizeInput(fillBlankAnswer)
    const isCorrect = item.acceptableAnswers.some((answer) => answer === normalizedInput)
    submitResult(isCorrect)
  }, [fillBlankAnswer, result, submitResult])

  const handleTrueFalse = useCallback((item: TrueFalseQuizItem, selection: boolean) => {
    if (result) return
    setTrueFalseSelection(selection)
    const isCorrect = selection === item.isTrue
    submitResult(isCorrect)
  }, [result, submitResult])

  const handleNext = useCallback(() => {
    setResult(null)
    setSelectedChoiceId(null)
    setFillBlankAnswer('')
    setTrueFalseSelection(null)
    setShowExplanation(false)
    setSubmissionError(null)
    setCurrentIndex((previous) => previous + 1)
  }, [])

  const renderMultipleChoice = (item: MultipleChoiceQuizItem) => (
    <div className="space-y-3">
      {item.choices.map((choice) => {
        const isSelected = selectedChoiceId === choice.id
        const showState = Boolean(result)
        const isCorrectChoice = choice.id === item.correctChoiceId
        const baseClass = 'w-full text-left px-4 py-3 rounded-md border transition-colors'
        const stateClass = !showState
          ? 'border-gray-200 hover:border-primary'
          : isCorrectChoice
            ? 'border-green-500 bg-green-50 text-green-700'
            : isSelected
              ? 'border-red-500 bg-red-50 text-red-600'
              : 'border-gray-200 text-gray-500'

        return (
          <button
            key={choice.id}
            type="button"
            className={`${baseClass} ${stateClass}`}
            onClick={() => handleMultipleChoice(item, choice.id)}
            disabled={Boolean(result)}
          >
            {choice.text}
          </button>
        )
      })}
    </div>
  )

  const renderFillBlank = (item: FillBlankQuizItem) => {
    const isCorrect = result === 'correct'
    return (
      <div className="space-y-4">
        <input
          type="text"
          value={fillBlankAnswer}
          onChange={(event) => setFillBlankAnswer(event.target.value)}
          className="w-full rounded-md border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Type your answer"
          disabled={Boolean(result)}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleFillBlankSubmit(item)}
          disabled={Boolean(result) || fillBlankAnswer.trim().length === 0}
        >
          Check Answer
        </button>
        {Boolean(result) && (
          <div className={`rounded-md border px-4 py-3 ${isCorrect ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-600'}`}>
            Correct answer: <span className="font-semibold">{item.answer}</span>
          </div>
        )}
      </div>
    )
  }

  const renderTrueFalse = (item: TrueFalseQuizItem) => (
    <div className="space-y-3">
      <div className="rounded-md border border-gray-200 px-4 py-3 bg-gray-50 text-gray-700">
        {item.statement}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={`px-4 py-3 rounded-md border transition-colors ${trueFalseSelection === true ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:border-primary'}`}
          onClick={() => handleTrueFalse(item, true)}
          disabled={Boolean(result)}
        >
          True
        </button>
        <button
          type="button"
          className={`px-4 py-3 rounded-md border transition-colors ${trueFalseSelection === false ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:border-primary'}`}
          onClick={() => handleTrueFalse(item, false)}
          disabled={Boolean(result)}
        >
          False
        </button>
      </div>
      {Boolean(result) && (
        <div className={`rounded-md border px-4 py-3 ${result === 'correct' ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-600'}`}>
          This statement is {item.isTrue ? 'true' : 'false'}.
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <p className="text-gray-600">Loading quiz...</p>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-accent flex flex-col items-center justify-center p-8">
        <div className="card max-w-md w-full text-center space-y-4">
          <h2 className="text-2xl font-bold text-primary">Quiz complete!</h2>
          <p className="text-gray-600">
            You answered {score} out of {attempts} questions correctly.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={`/decks/${deckId}`} className="btn-primary">
              Back to Deck
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.refresh()}
            >
              Retry Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-accent flex flex-col items-center justify-center p-8">
        <div className="card max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">No Quiz Items Ready</h2>
          <p className="text-gray-600 mb-6">
            There are no cards scheduled for a quiz right now.
          </p>
          <Link href={`/decks/${deckId}`} className="btn-primary">
            Back to Deck
          </Link>
        </div>
      </div>
    )
  }

  const progressPercent = ((currentIndex + 1) / items.length) * 100
  const isLastQuestion = currentIndex === items.length - 1

  return (
    <div className="min-h-screen bg-accent flex flex-col">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Link href={`/decks/${deckId}`} className="text-primary hover:underline text-sm sm:text-base whitespace-nowrap">
                ← Deck
              </Link>
              {deckTitle && (
                <>
                  <div className="text-gray-400 hidden sm:block">|</div>
                  <h1 className="text-sm sm:text-lg font-semibold text-gray-800 truncate">{deckTitle}</h1>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm sm:text-base text-gray-700">
                Score: <span className="font-semibold">{score}</span> / {attempts}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {currentIndex + 1}/{items.length}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 pt-8 sm:pt-12">
        {warning && (
          <div className="max-w-2xl w-full mb-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">{warning}</p>
          </div>
        )}

        <div className="card max-w-2xl w-full">
          <div className="mb-6">
            <div className="w-full bg-muted rounded-full h-2 mb-4">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-gray-500">
              <span>Due: {stats.due}</span>
              <span>New: {stats.new}</span>
              <span>Total: {stats.total}</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg sm:text-2xl font-medium text-primary mb-2">
                {currentItem.prompt}
              </h2>
            </div>

            {currentItem.type === 'multiple_choice' && renderMultipleChoice(currentItem as MultipleChoiceQuizItem)}
            {currentItem.type === 'fill_blank' && renderFillBlank(currentItem as FillBlankQuizItem)}
            {currentItem.type === 'true_false' && renderTrueFalse(currentItem as TrueFalseQuizItem)}

            {showExplanation && currentItem.explanation && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
                {currentItem.explanation}
              </div>
            )}

            {submissionError && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-700">
                {submissionError}
              </div>
            )}

            {result && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleNext}
                >
                  {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  )
}
