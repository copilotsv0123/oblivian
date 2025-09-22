import { NextResponse } from 'next/server'
import { withApiHandler, ApiContextOptionalAuth } from '@/lib/middleware/api-wrapper'
import { generateGoogleAuthUrl } from '@/lib/auth/googleOAuth'
import { createOAuthStateCookie } from '@/lib/auth/session'
import { getAuthConfig } from '@/lib/auth/config'

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

  await createOAuthStateCookie({ state, codeVerifier, returnUrl })

  return { url }
}, { requireAuth: false })
