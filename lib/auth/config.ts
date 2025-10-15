export interface AuthConfig {
  enabled: boolean
  googleClientId?: string
  googleClientSecret?: string
  googleRedirectUri?: string
  sessionSecret?: string
  sessionDuration: number
}

const OAUTH_COOKIE_DURATION_SECONDS = 600

let cachedConfig: AuthConfig | null = null

function validateConfig(config: AuthConfig) {
  if (!config.enabled) {
    return
  }

  const missing: string[] = []

  if (!config.googleClientId) missing.push('GOOGLE_CLIENT_ID')
  if (!config.googleClientSecret) missing.push('GOOGLE_CLIENT_SECRET')
  if (!config.googleRedirectUri) missing.push('GOOGLE_REDIRECT_URI')
  if (!config.sessionSecret) missing.push('AUTH_SESSION_SECRET')

  if (missing.length > 0) {
    throw new Error(`Missing required Google auth environment variables: ${missing.join(', ')}`)
  }

  if ((config.sessionSecret?.length || 0) < 32) {
    throw new Error('AUTH_SESSION_SECRET must be at least 32 characters long')
  }

  if (!Number.isFinite(config.sessionDuration) || config.sessionDuration <= 0) {
    throw new Error('AUTH_SESSION_DURATION must be a positive integer representing seconds')
  }
}

export function getAuthConfig(): AuthConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const enabled = process.env.GOOGLE_AUTH_ENABLED === 'true'
  const sessionDuration = parseInt(process.env.AUTH_SESSION_DURATION || '86400', 10)

  const config: AuthConfig = {
    enabled,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost'}/api/auth/google/callback`,
    sessionSecret: process.env.AUTH_SESSION_SECRET,
    sessionDuration,
  }

  validateConfig(config)

  cachedConfig = config
  return config
}

export const OAUTH_SCOPES = ['openid', 'email', 'profile'] as const

export const OAUTH_STATE_COOKIE_MAX_AGE = OAUTH_COOKIE_DURATION_SECONDS
