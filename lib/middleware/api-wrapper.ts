import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/middleware'

export interface ApiContext {
  user: {
    id: string
    email: string
    name: string
  }
  request: NextRequest
}

export interface ApiContextOptionalAuth {
  user?: {
    id: string
    email: string
    name: string
  }
  request: NextRequest
}

export type ApiHandler<T = any, P = any> = (
  context: ApiContext,
  routeContext?: P
) => Promise<T> | T

export type ApiHandlerOptionalAuth<T = any, P = any> = (
  context: ApiContextOptionalAuth,
  routeContext?: P
) => Promise<T> | T

export interface ApiOptions {
  requireAuth?: boolean
}

/**
 * Wraps API route handlers with consistent error handling and authentication
 */
export function withApiHandler<T = any, P = any>(
  handler: ApiHandler<T, P> | ApiHandlerOptionalAuth<T, P>,
  options: ApiOptions = { requireAuth: true }
) {
  return async (request: NextRequest, routeContext?: P) => {
    try {
      // Handle authentication if required
      let user = undefined
      if (options.requireAuth !== false) {
        user = await authenticateRequest(request)
        if (!user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
      } else {
        // Still try to get user for optional auth endpoints
        user = await authenticateRequest(request)
      }

      // Create context based on auth requirement
      const context = options.requireAuth !== false 
        ? { user: user!, request } as ApiContext
        : { user, request } as ApiContextOptionalAuth

      // Execute handler
      const result = await handler(context as any, routeContext)

      // Handle different response types
      if (result instanceof NextResponse) {
        return result
      }

      // Default to JSON response
      return NextResponse.json(result)
    } catch (error) {
      console.error('API Error:', error)

      // Handle known error types
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: error.message },
            { status: 404 }
          )
        }
        if (error.message.includes('unauthorized') || 
            error.message.includes('forbidden')) {
          return NextResponse.json(
            { error: error.message },
            { status: 403 }
          )
        }
        if (error.message.includes('bad request') || 
            error.message.includes('invalid')) {
          return NextResponse.json(
            { error: error.message },
            { status: 400 }
          )
        }
      }

      // Default error response
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Helper to extract and parse JSON body
 */
export async function getJsonBody<T = any>(request: NextRequest): Promise<T> {
  try {
    return await request.json()
  } catch (error) {
    throw new Error('Invalid request body')
  }
}

/**
 * Helper to get URL params
 */
export function getParams(request: NextRequest): URLSearchParams {
  const { searchParams } = new URL(request.url)
  return searchParams
}