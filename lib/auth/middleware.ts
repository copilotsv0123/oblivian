import { NextRequest } from 'next/server'
import { getCurrentSession } from './session'
import { getCurrentUser } from './jwt'
import { validateApiToken } from './token'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

/**
 * Authenticate a request using either JWT cookie or Bearer token
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthUser | null> {
  // First try secure session authentication (for web UI)
  const session = await getCurrentSession()
  if (session) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    }
  }

  // Fallback to legacy JWT authentication if a session does not exist
  const legacyUser = await getCurrentUser()
  if (legacyUser) {
    return {
      id: legacyUser.id,
      email: legacyUser.email,
      name: legacyUser.email,
      avatarUrl: null,
    }
  }

  // Then try Bearer token authentication (for API/MCP)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const tokenUser = await validateApiToken(token)
    if (tokenUser) {
      return {
        id: tokenUser.userId,
        email: tokenUser.userEmail,
        name: tokenUser.userEmail,
        avatarUrl: null,
      }
    }
  }

  return null
}