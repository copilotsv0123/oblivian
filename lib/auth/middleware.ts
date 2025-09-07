import { NextRequest } from 'next/server'
import { getCurrentUser } from './jwt'
import { validateApiToken } from './token'

export interface AuthUser {
  id: string
  email: string
}

/**
 * Authenticate a request using either JWT cookie or Bearer token
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthUser | null> {
  // First try JWT cookie authentication (for web UI)
  const cookieUser = await getCurrentUser()
  if (cookieUser) {
    return cookieUser
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
      }
    }
  }

  return null
}