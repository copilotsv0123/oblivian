'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { X, Tag } from 'lucide-react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  suggestions?: string[]
  className?: string
}

export default function TagInput({
  tags,
  onChange,
  placeholder = "Add tags...",
  maxTags = 10,
  suggestions = [],
  className = ""
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = suggestions.filter(
        suggestion =>
          suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(suggestion)
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [inputValue, suggestions, tags])

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (
      trimmedTag &&
      !tags.includes(trimmedTag) &&
      tags.length < maxTags &&
      /^[a-zA-Z0-9\s-_]+$/.test(trimmedTag) &&
      trimmedTag.length <= 50
    ) {
      onChange([...tags, trimmedTag])
      setInputValue('')
      setShowSuggestions(false)
    }
  }

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2 p-3 border border-border rounded-md bg-background min-h-[2.5rem] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
        {/* Tag pills */}
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-md"
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Input field */}
        {tags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 outline-none bg-transparent text-sm min-w-[100px]"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
            >
              <Tag className="h-3 w-3 inline mr-2" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="mt-1 text-xs text-muted-foreground">
        {tags.length}/{maxTags} tags • Press Enter or comma to add • Only letters, numbers, spaces, hyphens, and underscores
      </div>
    </div>
  )
}