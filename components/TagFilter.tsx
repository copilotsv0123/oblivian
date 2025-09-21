'use client'

import { useState, useEffect } from 'react'
import { Tag, X, ChevronDown } from 'lucide-react'

interface TagFilterProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  availableTags: string[]
  className?: string
}

export default function TagFilter({
  selectedTags,
  onTagsChange,
  availableTags,
  className = ""
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const clearAllTags = () => {
    onTagsChange([])
  }

  const unselectedTags = availableTags.filter(tag => !selectedTags.includes(tag))

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Selected tags display */}
        {selectedTags.length > 0 && (
          <>
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-sm rounded-md"
              >
                <Tag className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="hover:bg-primary/80 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAllTags}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </>
        )}

        {/* Tag selector dropdown */}
        {unselectedTags.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-background hover:bg-muted text-sm"
            >
              <Tag className="h-4 w-4" />
              Add tag filter
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 min-w-[200px] max-h-40 overflow-y-auto">
                {unselectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      toggleTag(tag)
                      setIsOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}