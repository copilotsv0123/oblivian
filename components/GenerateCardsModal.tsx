'use client'

import { useState } from 'react'

interface GenerateCardsModalProps {
  deckId: string
  onClose: () => void
  onGenerated: (cards: any[]) => void
}

export default function GenerateCardsModal({
  deckId,
  onClose,
  onGenerated,
}: GenerateCardsModalProps) {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState<'simple' | 'mid' | 'expert'>('simple')
  const [types, setTypes] = useState({
    basic: true,
    cloze: true,
    multiple_choice: false,
    explain: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedCards, setGeneratedCards] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleGenerate = async () => {
    setError('')
    setLoading(true)

    const selectedTypes = Object.entries(types)
      .filter(([_, selected]) => selected)
      .map(([type]) => type)

    if (selectedTypes.length === 0) {
      setError('Please select at least one card type')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId,
          topic,
          count,
          difficulty,
          types: selectedTypes,
          language: 'en',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate cards')
      }

      const data = await res.json()
      setGeneratedCards(data.cards)
      setShowPreview(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (generatedCards.length === 0) return

    setLoading(true)
    setError('')

    try {
      let successCount = 0
      let failureCount = 0
      const maxRetries = 2

      for (const card of generatedCards) {
        let imported = false
        
        for (let attempt = 0; attempt <= maxRetries && !imported; attempt++) {
          try {
            const res = await fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deckId,
                ...card,
              }),
            })

            if (res.ok) {
              successCount++
              imported = true
            } else if (attempt === maxRetries) {
              failureCount++
            }
          } catch (err) {
            if (attempt === maxRetries) {
              failureCount++
            }
          }
        }
      }

      if (failureCount > 0 && successCount === 0) {
        throw new Error('Failed to import all cards')
      }

      if (failureCount > 0) {
        setError(`Imported ${successCount} cards successfully. ${failureCount} cards failed.`)
      }

      onGenerated(generatedCards)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-primary mb-4">
          {showPreview ? 'Preview Generated Cards' : 'Generate Cards with AI'}
        </h3>

        {!showPreview ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="topic" className="label">Topic</label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="input"
                placeholder="e.g., French Revolution, Python Programming, Cell Biology"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="count" className="label">Number of Cards</label>
              <input
                id="count"
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 10)}
                className="input"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="difficulty" className="label">Difficulty Level</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="input"
                disabled={loading}
              >
                <option value="simple">Simple</option>
                <option value="mid">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="label">Card Types</label>
              <div className="space-y-2">
                {Object.entries(types).map(([type, selected]) => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => setTypes({ ...types, [type]: e.target.checked })}
                      disabled={loading}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">
                      {type.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                className="btn-primary flex-1"
                disabled={loading || !topic}
              >
                {loading ? 'Generating...' : 'Generate Cards'}
              </button>
              <button
                onClick={onClose}
                className="btn-outline flex-1"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Generated {generatedCards.length} cards. Review them below:
            </p>

            <div className="max-h-96 overflow-y-auto space-y-3 border rounded-lg p-3">
              {generatedCards.map((card, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {card.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">#{index + 1}</span>
                  </div>
                  <p className="text-sm font-medium text-primary mb-1">
                    {card.front}
                  </p>
                  {card.back && (
                    <p className="text-sm text-gray-600">
                      Answer: {card.back}
                    </p>
                  )}
                  {card.explanation && (
                    <p className="text-sm text-gray-600">
                      {card.explanation}
                    </p>
                  )}
                  {card.choices && (
                    <ul className="text-sm text-gray-600 mt-1">
                      {card.choices.map((choice: any, i: number) => (
                        <li key={i} className={choice.isCorrect ? 'text-green-600' : ''}>
                          {choice.isCorrect ? '✓' : '○'} {choice.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Importing...' : 'Import All Cards'}
              </button>
              <button
                onClick={() => {
                  setShowPreview(false)
                  setGeneratedCards([])
                }}
                className="btn-outline flex-1"
                disabled={loading}
              >
                Back to Generate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}