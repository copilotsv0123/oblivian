'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ApiToken {
  id: string
  name: string
  tokenPreview: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/tokens')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch tokens')
      }
      const data = await res.json()
      setTokens(data.tokens)
    } catch (error) {
      console.error('Error fetching tokens:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token?')) {
      return
    }

    try {
      const res = await fetch(`/api/tokens?id=${tokenId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchTokens()
      }
    } catch (error) {
      console.error('Error deleting token:', error)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-accent">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-primary hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="text-xl font-bold text-primary">Settings</h1>
            <div className="w-24" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4">API Tokens</h2>
          <p className="text-gray-600 mb-6">
            Create API tokens to use with Claude Desktop&apos;s MCP integration. 
            These tokens allow Claude to manage your decks and cards.
          </p>

          <div className="mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create New Token
            </button>
          </div>

          {newTokenValue && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold text-green-800 mb-2">
                New token created! Copy it now - you won&apos;t see it again:
              </p>
              <div className="bg-white p-3 rounded border border-green-300 font-mono text-sm break-all">
                {newTokenValue}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newTokenValue)
                  alert('Token copied to clipboard!')
                }}
                className="mt-3 btn-secondary text-sm"
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-gray-600">Loading tokens...</p>
          ) : tokens.length === 0 ? (
            <p className="text-gray-600">No API tokens yet. Create one to get started with MCP.</p>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div key={token.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-primary">{token.name}</h3>
                      <p className="text-sm text-gray-600 font-mono mt-1">
                        Token: {token.tokenPreview}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Created: {formatDate(token.createdAt)}</span>
                        <span>Last used: {formatDate(token.lastUsedAt)}</span>
                        {token.expiresAt && (
                          <span>Expires: {formatDate(token.expiresAt)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteToken(token.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-primary mb-4">MCP Setup Instructions</h2>
          <p className="text-gray-600 mb-4">
            To use your API token with Claude Desktop:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Create an API token above</li>
            <li>Run <code className="bg-gray-100 px-2 py-1 rounded">npm run mcp:setup</code> in your terminal</li>
            <li>Add your token to the MCP server configuration</li>
            <li>Restart Claude Desktop</li>
          </ol>
          <Link href="/MCP_SETUP.md" className="text-primary hover:underline mt-4 inline-block">
            View detailed setup guide →
          </Link>
        </div>
      </main>

      {showCreateModal && (
        <CreateTokenModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(token) => {
            setShowCreateModal(false)
            setNewTokenValue(token)
            fetchTokens()
          }}
        />
      )}
    </div>
  )
}

function CreateTokenModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (token: string) => void
}) {
  const [name, setName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, expiresInDays }),
      })

      if (!res.ok) {
        throw new Error('Failed to create token')
      }

      const data = await res.json()
      onCreated(data.token.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <h3 className="text-2xl font-bold text-primary mb-4">Create API Token</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">Token Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Claude Desktop MCP"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="expires" className="label">Expiration (optional)</label>
            <select
              id="expires"
              value={expiresInDays || ''}
              onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : null)}
              className="input"
              disabled={loading}
            >
              <option value="">Never expire</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
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
              {loading ? 'Creating...' : 'Create Token'}
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