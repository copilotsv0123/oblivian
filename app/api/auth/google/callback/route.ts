import { NextRequest, NextResponse } from 'next/server'
import { getAuthConfig } from '@/lib/auth/config'
import { exchangeCodeForTokens, getGoogleUserInfo, verifyIdToken } from '@/lib/auth/googleOAuth'
import { clearOAuthStateCookie, readOAuthStateCookie, establishUserSession } from '@/lib/auth/session'
import { userRepository } from '@/lib/repositories'

function redirectWithError(request: NextRequest, message: string) {
  const origin = request.nextUrl.origin
  const url = new URL('/login', origin)
  url.searchParams.set('error', message)
  return NextResponse.redirect(url)
}

function sanitizeRedirectPath(path?: string | null) {
  if (!path || !path.startsWith('/')) {
    return '/dashboard'
  }
  return path
}

export async function GET(request: NextRequest) {
  const config = getAuthConfig()
  if (!config.enabled) {
    return redirectWithError(request, 'Google authentication is not enabled')
  }

  const currentUrl = new URL(request.url)
  const error = currentUrl.searchParams.get('error')
  if (error) {
    await clearOAuthStateCookie()
    return redirectWithError(request, error)
  }

  const code = currentUrl.searchParams.get('code')
  const state = currentUrl.searchParams.get('state')

  if (!code || !state) {
    await clearOAuthStateCookie()
    return redirectWithError(request, 'Invalid OAuth callback request')
  }

  const storedState = await readOAuthStateCookie()
  if (!storedState || storedState.state !== state) {
    await clearOAuthStateCookie()
    return redirectWithError(request, 'OAuth state validation failed')
  }

  await clearOAuthStateCookie()

  try {
    const tokens = await exchangeCodeForTokens(code, storedState.codeVerifier)
    const idPayload = await verifyIdToken(tokens.idToken)

    let profile
    try {
      profile = await getGoogleUserInfo(tokens.accessToken)
    } catch (profileError) {
      console.warn('Failed to fetch Google user profile, falling back to ID token payload', profileError)
      profile = null
    }

    const email = idPayload.email || profile?.email
    const googleId = idPayload.sub || profile?.sub

    if (!email || !googleId) {
      throw new Error('Missing email or Google ID in OAuth response')
    }

    const name = profile?.name || idPayload.name || null
    const avatarUrl = profile?.picture || (idPayload as any).picture || null

    const user = await userRepository.createOrUpdateGoogleUser({
      email,
      googleId,
      name,
      avatarUrl,
    })

    await establishUserSession(user.id, tokens)

    const redirectPath = sanitizeRedirectPath(storedState.returnUrl)
    const redirectUrl = new URL(redirectPath, request.nextUrl.origin)
    return NextResponse.redirect(redirectUrl)
  } catch (callbackError) {
    console.error('Google OAuth callback error:', callbackError)
    return redirectWithError(request, 'Authentication failed')
  }
}
