import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/middleware/api-wrapper'
import { destroyCurrentSession } from '@/lib/auth/session'
import { revokeGoogleTokens } from '@/lib/auth/googleOAuth'

export const POST = withApiHandler(async () => {
  const session = await destroyCurrentSession()

  if (session?.googleTokens.refreshToken) {
    try {
      await revokeGoogleTokens(session.googleTokens.refreshToken)
    } catch (error) {
      console.warn('Failed to revoke Google refresh token', error)
    }
  } else if (session?.googleTokens.accessToken) {
    try {
      await revokeGoogleTokens(session.googleTokens.accessToken)
    } catch (error) {
      console.warn('Failed to revoke Google access token', error)
    }
  }

  return NextResponse.json({ success: true })
}, { requireAuth: false })
