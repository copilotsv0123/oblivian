import { NextRequest, NextResponse } from 'next/server'
import { isConfigValid } from '@/lib/config/env'
import { handleApiError } from '@/lib/errors/api-error'

export type ApiHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse

/**
 * Wraps API route handlers to ensure:
 * 1. Configuration is valid
 * 2. All responses are JSON
 * 3. Errors are handled consistently
 */
export function withApiHandler(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      // Check configuration validity
      if (!isConfigValid()) {
        return NextResponse.json(
          { 
            error: 'Server configuration error',
            message: 'The server is not properly configured. Please contact the administrator.'
          },
          { status: 503 } // Service Unavailable
        )
      }

      // Execute the actual handler
      const response = await handler(request, context)
      
      // Ensure response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        console.warn('API handler returned non-JSON response')
      }
      
      return response
    } catch (error) {
      // Always return JSON for errors
      return handleApiError(error)
    }
  }
}

/**
 * Higher-order function for creating API route handlers
 * Ensures consistent error handling and JSON responses
 */
export function createApiRoute(
  methods: {
    GET?: ApiHandler
    POST?: ApiHandler
    PUT?: ApiHandler
    PATCH?: ApiHandler
    DELETE?: ApiHandler
  }
) {
  const handlers: Record<string, ApiHandler> = {}

  // Wrap each method handler
  for (const [method, handler] of Object.entries(methods)) {
    if (handler) {
      handlers[method] = withApiHandler(handler)
    }
  }

  return handlers
}