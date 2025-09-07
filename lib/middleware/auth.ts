import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/jwt'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
  }
}

export async function withAuth<T = any>(
  handler: (
    request: AuthenticatedRequest,
    context: T
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, context: T) => {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = user

    return handler(authenticatedRequest, context)
  }
}

export async function requireAuth(request: NextRequest) {
  const user = await getCurrentUser()
  
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return { user, error: null }
}