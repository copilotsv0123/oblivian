import { NextResponse } from 'next/server'
import { withApiHandler, ApiContextOptionalAuth } from '@/lib/middleware/api-wrapper'
import { generateGoogleAuthUrl } from '@/lib/auth/googleOAuth'
import { createOAuthStateToken, OAUTH_STATE_COOKIE_NAME } from '@/lib/auth/session'
import { getAuthConfig, OAUTH_STATE_COOKIE_MAX_AGE } from '@/lib/auth/config'

function sanitizeReturnUrl(url?: unknown): string {
  if (typeof url !== 'string') {
    return '/dashboard'
  }

  if (!url.startsWith('/')) {
    return '/dashboard'
  }

  return url
}

export const POST = withApiHandler(async ({ request }: ApiContextOptionalAuth) => {
  const config = getAuthConfig()
  if (!config.enabled) {
    return NextResponse.json({ error: 'Google authentication is not enabled' }, { status: 503 })
  }

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const { url, state, codeVerifier } = await generateGoogleAuthUrl()
  const returnUrl = sanitizeReturnUrl(body.returnUrl)

  const token = await createOAuthStateToken({ state, codeVerifier, returnUrl })
  const response = NextResponse.json({ url })

  response.cookies.set(OAUTH_STATE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE,
  })

  return response
}, { requireAuth: false })
