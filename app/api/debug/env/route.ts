import { NextResponse } from 'next/server'

export async function GET() {
  // Only enable in development or with a secret key for safety
  const isDev = process.env.NODE_ENV === 'development'
  const debugKey = process.env.DEBUG_KEY

  if (!isDev && !debugKey) {
    return NextResponse.json({ error: 'Debug endpoint not available' }, { status: 404 })
  }

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    GOOGLE_AUTH_ENABLED: process.env.GOOGLE_AUTH_ENABLED,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT_SET',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET ? 'SET' : 'NOT_SET',
    AUTH_SESSION_DURATION: process.env.AUTH_SESSION_DURATION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
  }

  // Test the auth config
  let configResult
  try {
    const { getAuthConfig } = await import('@/lib/auth/config')
    const config = getAuthConfig()
    configResult = {
      enabled: config.enabled,
      hasClientId: !!config.googleClientId,
      hasClientSecret: !!config.googleClientSecret,
      hasSessionSecret: !!config.sessionSecret,
      redirectUri: config.googleRedirectUri,
      sessionDuration: config.sessionDuration,
    }
  } catch (error) {
    configResult = { error: error instanceof Error ? error.message : 'Unknown error' }
  }

  return NextResponse.json({
    environment: envVars,
    authConfig: configResult,
    timestamp: new Date().toISOString(),
  })
}